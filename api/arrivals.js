const axios = require('axios');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');

// NO API KEY NEEDED ANYMORE!

// We will filter for these IDs. 
const TARGET_STATIONS = ['137', 'A36', 'D24', 'R31', 'A41', 'R29', 'D20', 'R27'];

const FEEDS = [
  'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs',      // 1 2 3 4 5 6 S
  'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace',  // A C E
  'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm', // B D F M
  'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw', // N Q R W
  // 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/lirr%2Fgtfs-lirr'  // LIRR
];

export default async function handler(req, res) {
  try {
    const allArrivals = {};

    // 1. Fetch feeds WITHOUT headers (Public Access)
    const responses = await Promise.all(FEEDS.map(url => 
      axios.get(url, {
        responseType: 'arraybuffer' 
        // No headers needed!
      })
    ));

    responses.forEach(response => {
      try {
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
          new Uint8Array(response.data)
        );

        feed.entity.forEach(entity => {
        if (entity.tripUpdate && entity.tripUpdate.stopTimeUpdate) {
            const routeId = entity.tripUpdate.trip.routeId;
            
            entity.tripUpdate.stopTimeUpdate.forEach(stopUpdate => {
              const stopId = stopUpdate.stopId;
              const parentId = stopId.substring(0, 3); 
              const direction = stopId.substring(3);

              // Only process stations in our list
              if (TARGET_STATIONS.includes(parentId)) {
                if (!allArrivals[parentId]) allArrivals[parentId] = { N: {}, S: {} };
                
                const dirKey = (direction === 'N' || direction === 'S') ? direction : 'N';
                if (!allArrivals[parentId][dirKey]) allArrivals[parentId][dirKey] = {};

                const arrivalTime = stopUpdate.arrival ? stopUpdate.arrival.time : stopUpdate.departure.time;
                const now = Math.floor(Date.now() / 1000);
                const minutesUntil = Math.max(0, Math.round((arrivalTime - now) / 60));

                if (!allArrivals[parentId][dirKey][routeId]) {
                  allArrivals[parentId][dirKey][routeId] = [];
                }
                allArrivals[parentId][dirKey][routeId].push(minutesUntil);
              }
            });
		}
        });
      } catch (err) {
        console.log("Feed decode warning (skipping feed)");
      }
    });

    // Sort times
    Object.keys(allArrivals).forEach(station => {
      ['N', 'S'].forEach(dir => {
        if (allArrivals[station][dir]) {
          Object.keys(allArrivals[station][dir]).forEach(line => {
            allArrivals[station][dir][line].sort((a, b) => a - b);
          });
        }
      });
    });

    res.status(200).json(allArrivals);

  } catch (error) {
    console.error('MTA Fetch Error:', error);
    res.status(500).json({ error: 'Failed to fetch MTA data' });
  }
}
