import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowDown, ArrowUp, RefreshCw, Activity, WifiOff } from 'lucide-react';

const STATIONS = {
  CHAMBERS_IRT: '137', 
  CHAMBERS_IND: 'A36', 
  ATLANTIC_BQ: 'D24',  
  ATLANTIC_DNR: 'R31', 
  JAY_F: 'A41',        
  JAY_R: 'R29',        
  W4_BDFM: 'D20',      
  WHITEHALL_R: 'R27',
  LIRR_PENN: 'LIRR_PENN' // Matches the ID we created in api/arrivals.js
};

const TransitConnections = () => {
  const [time, setTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [realtimeData, setRealtimeData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchRealData = async () => {
      setLoading(true);
      setError(false);
      try {
        const response = await fetch('/api/arrivals');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setRealtimeData(data);
      } catch (err) {
        console.error("API Error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchRealData();
    const interval = setInterval(fetchRealData, 30000); 
    return () => clearInterval(interval);
  }, []);

  // --- SI FERRY CALCULATOR ---
  const getNextFerry = () => {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    
    // Schedule in minutes from midnight (Based on your image)
    const schedule = [
      0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, // 12am-6am (30 min intervals)
      390, 410, 430, 450, 465, 480, 495, 510, 525, 540, 555, 570, // Morning Rush (6:30-9:30)
      600, 630, 660, 690, 720, 750, 780, 810, 840, 870, 900, 930, // Midday (30 min)
      960, 980, 1000, 1020, 1040, 1055, 1070, 1085, 1100, 1115, 1130, 1140, // PM Rush (4:00-7:00)
      1170, 1200, 1230, 1260, 1290, 1320, 1350, 1380, 1410 // Evening (30 min)
    ];

    // Find next ferry
    let next = schedule.find(m => m > currentMins);
    
    // If no more ferries today, wrap to tomorrow's first (00:00)
    if (!next) next = 1440; // 24 hours in minutes

    const diff = next - currentMins;
    
    // Formatting
    if (diff <= 0 || diff > 1400) return "Dep"; // Departing now
    
    // Convert minutes back to HH:MM AM/PM
    let displayTime = next >= 1440 ? 0 : next;
    const h = Math.floor(displayTime / 60);
    const m = displayTime % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    const mStr = m < 10 ? '0'+m : m;
    
    return `${h12}:${mStr} ${ampm}`;
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getLineStyles = (line) => {
    const styles = {
      '1': 'bg-[#EE352E] text-white', '2': 'bg-[#EE352E] text-white', '3': 'bg-[#EE352E] text-white',
      'A': 'bg-[#0039A6] text-white', 'C': 'bg-[#0039A6] text-white', 'E': 'bg-[#0039A6] text-white',
      'B': 'bg-[#FF6319] text-white', 'D': 'bg-[#FF6319] text-white', 'F': 'bg-[#FF6319] text-white', 'M': 'bg-[#FF6319] text-white',
      'N': 'bg-[#FCCC0A] text-black', 'Q': 'bg-[#FCCC0A] text-black', 'R': 'bg-[#FCCC0A] text-black', 'W': 'bg-[#FCCC0A] text-black',
      'PW': 'bg-[#0069AA] text-white text-[9px] tracking-tighter', 
      'FERRY': 'bg-[#FF6600] text-white text-[8px]', 
    };
    return styles[line] || 'bg-gray-500 text-white';
  };

  const getArrivalStr = (mins) => (mins === 0 || mins === 'Arr') ? 'Arr' : `${mins}m`;

  const getRT = (stationId, dir, line, index, fallback) => {
    if (!realtimeData || !realtimeData[stationId]) return fallback;
    const dKey = dir === 'Uptown' ? 'N' : 'S';
    const sData = realtimeData[stationId][dKey];
    if (!sData || !sData[line] || sData[line].length <= index) return fallback;
    return getArrivalStr(sData[line][index]);
  };
  
  const lineGroups = [
    {
      id: "1",
      station: "Chambers St",
      lines: ["1"],
      downtown: {
        primary: { line: "1", time: getRT(STATIONS.CHAMBERS_IRT, 'Downtown', '1', 0, "5m"), dest: "South Ferry" },
        secondary: [
          getRT(STATIONS.CHAMBERS_IRT, 'Downtown', '1', 1, "12m"),
          getRT(STATIONS.CHAMBERS_IRT, 'Downtown', '1', 2, "19m")
        ],
        transfer: {
          station: "Whitehall / South Ferry",
          items: [
            { line: "FERRY", time: getNextFerry() },
            { line: "R", time: getRT(STATIONS.WHITEHALL_R, 'Downtown', 'R', 0, "3m") }
          ]
        }
      },
      uptown: {
        primary: { line: "1", time: getRT(STATIONS.CHAMBERS_IRT, 'Uptown', '1', 0, "3m"), dest: "Van Cortlandt" },
        secondary: [
          getRT(STATIONS.CHAMBERS_IRT, 'Uptown', '1', 1, "8m"),
          getRT(STATIONS.CHAMBERS_IRT, 'Uptown', '1', 2, "15m")
        ],
        transfer: {
          station: "Penn Station",
          items: [
            { line: "PW", time: getRT(STATIONS.LIRR_PENN, 'Uptown', 'PW', 0, "Check Board") }
          ]
        }
      }
    },
    {
      id: "2/3",
      station: "Chambers St",
      lines: ["2", "3"],
      downtown: {
        primary: { line: "2", time: getRT(STATIONS.CHAMBERS_IRT, 'Downtown', '2', 0, "1m"), dest: "Flatbush Av" },
        secondary: [
          { line: "3", time: getRT(STATIONS.CHAMBERS_IRT, 'Downtown', '3', 0, "4m") },
          { line: "2", time: getRT(STATIONS.CHAMBERS_IRT, 'Downtown', '2', 1, "9m") }
        ],
        transfer: {
          station: "Atlantic Av",
          items: [
            { line: "Q", time: getRT(STATIONS.ATLANTIC_BQ, 'Downtown', 'Q', 0, "1m") },
            { line: "B", time: getRT(STATIONS.ATLANTIC_BQ, 'Downtown', 'B', 0, "4m") },
            { line: "R", time: getRT(STATIONS.ATLANTIC_DNR, 'Downtown', 'R', 0, "6m") },
            { line: "D", time: getRT(STATIONS.ATLANTIC_DNR, 'Downtown', 'D', 0, "8m") },
            { line: "N", time: getRT(STATIONS.ATLANTIC_DNR, 'Downtown', 'N', 0, "5m") },
          ]
        }
      },
      uptown: {
        primary: { line: "3", time: getRT(STATIONS.CHAMBERS_IRT, 'Uptown', '3', 0, "2m"), dest: "Harlem 148" },
        secondary: [
          { line: "2", time: getRT(STATIONS.CHAMBERS_IRT, 'Uptown', '2', 0, "6m") },
          { line: "3", time: getRT(STATIONS.CHAMBERS_IRT, 'Uptown', '3', 1, "12m") }
        ],
        transfer: {
          station: "Penn Station",
          items: [
             { line: "PW", time: getRT(STATIONS.LIRR_PENN, 'Uptown', 'PW', 0, "Check Board") }
          ]
        }
      }
    },
    {
      id: "A/C",
      station: "Chambers St",
      lines: ["A", "C"],
      downtown: {
        primary: { line: "A", time: getRT(STATIONS.CHAMBERS_IND, 'Downtown', 'A', 0, "3m"), dest: "Far Rockaway" },
        secondary: [
          { line: "C", time: getRT(STATIONS.CHAMBERS_IND, 'Downtown', 'C', 0, "7m") },
          { line: "A", time: getRT(STATIONS.CHAMBERS_IND, 'Downtown', 'A', 1, "12m") }
        ],
        transfer: {
          station: "Jay St-MetroTech",
          items: [
            { line: "F", time: getRT(STATIONS.JAY_F, 'Downtown', 'F', 0, "2m") },
            { line: "R", time: getRT(STATIONS.JAY_R, 'Downtown', 'R', 0, "5m") }
          ]
        }
      },
      uptown: {
        primary: { line: "C", time: getRT(STATIONS.CHAMBERS_IND, 'Uptown', 'C', 0, "Arr"), dest: "168 St" },
        secondary: [
          { line: "A", time: getRT(STATIONS.CHAMBERS_IND, 'Uptown', 'A', 0, "5m") },
          { line: "C", time: getRT(STATIONS.CHAMBERS_IND, 'Uptown', 'C', 1, "11m") }
        ],
        transfer: {
          station: "W 4 St",
          items: [
            { line: "B", time: getRT(STATIONS.W4_BDFM, 'Uptown', 'B', 0, "1m") },
            { line: "D", time: getRT(STATIONS.W4_BDFM, 'Uptown', 'D', 0, "3m") },
            { line: "M", time: getRT(STATIONS.W4_BDFM, 'Uptown', 'M', 0, "5m") },
            { line: "F", time: getRT(STATIONS.W4_BDFM, 'Uptown', 'F', 0, "7m") }
          ]
        }
      }
    }
  ];

  const renderDirectionBlock = (data, direction) => {
    const isUptown = direction === 'Uptown';
    const accentColor = isUptown ? 'text-blue-400' : 'text-green-400';
    const dirIcon = isUptown ? <ArrowUp size={14} className={accentColor} /> : <ArrowDown size={14} className={accentColor} />;

    return (
      <div className={`flex-1 flex flex-col p-3 ${!isUptown ? 'border-b md:border-b-0 md:border-r border-gray-800' : ''}`}>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-1.5 uppercase font-bold text-xs tracking-wider text-gray-400">
            {dirIcon}
            <span className={accentColor}>{direction}</span>
            <span className="text-gray-600 px-1">•</span>
            <span className="text-white truncate max-w-[120px]">{data.primary.dest}</span>
          </div>
          <div className="flex gap-1.5">
             {data.secondary.slice(0, 2).map((item, i) => {
               const line = typeof item === 'object' ? item.line : data.primary.line;
               const time = typeof item === 'object' ? item.time : item;
               return (
                 <div key={i} className="flex items-center bg-neutral-800 rounded px-2 py-1 border border-neutral-700">
                   <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-[9px] mr-1.5 ${getLineStyles(line)}`}>
                     {line}
                   </div>
                   <span className="text-xs text-gray-200 font-mono font-bold">{time}</span>
                 </div>
               );
             })}
          </div>
        </div>
        <div className="flex items-stretch gap-4">
          <div className="flex items-center gap-3 min-w-[120px]">
            <div className={`w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center text-3xl font-bold shadow-lg ${getLineStyles(data.primary.line)}`}>
              {data.primary.line}
            </div>
            <span className={`text-3xl font-bold tracking-tight ${data.primary.time === 'Arr' ? 'text-[#FCCC0A] animate-pulse' : 'text-white'}`}>
              {data.primary.time}
            </span>
          </div>
          <div className="w-px bg-gray-800 my-1"></div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-1.5 flex items-center gap-1">
              <ArrowRight size={10} />
              Connection @ {data.transfer.station}
            </div>
            <div className="flex flex-wrap gap-2">
              {data.transfer.items.map((conn, idx) => (
                <div key={idx} className={`bg-neutral-800 rounded p-1 flex items-center gap-1.5 border border-neutral-700`}>
                  <div className={`w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-[10px] ${getLineStyles(conn.line)}`}>
                    {conn.line === 'FERRY' ? 'SI' : conn.line}
                  </div>
                  <span className="text-white font-mono font-bold text-[10px]">{conn.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col">
      <header className="bg-neutral-900 border-b border-gray-700 flex justify-between items-center px-4 py-3">
        <div className="flex items-center gap-2">
           <div className="w-1.5 h-6 bg-[#FCCC0A]"></div>
           <h1 className="text-xl font-bold tracking-tight">Stuyvesant Transit</h1>
           {loading && <RefreshCw className="animate-spin text-gray-500 ml-2" size={14} />}
           {!loading && realtimeData && <Activity className="text-green-500 ml-2" size={14} />}
           {error && <WifiOff className="text-red-500 ml-2" size={14} />}
        </div>
        <div className="text-right font-mono text-lg text-[#FCCC0A]">
          {formatTime(time)}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {lineGroups.map((group, index) => (
          <div key={index} className="border-b border-gray-800 last:border-0 bg-neutral-900">
            <div className="bg-neutral-800 px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b border-neutral-700/50">
               {group.lines.map(l => (
                 <span key={l} className={`inline-block w-4 h-4 text-center leading-4 rounded-full text-[9px] ${getLineStyles(l)}`}>{l}</span>
               ))}
               <span>{group.station}</span>
            </div>
            <div className="flex flex-col md:flex-row">
              {renderDirectionBlock(group.downtown, 'Downtown')}
              {renderDirectionBlock(group.uptown, 'Uptown')}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#111] py-1.5 px-4 border-t border-gray-800">
        <div className="flex items-center gap-2">
           <div className={`w-1.5 h-1.5 rounded-full ${realtimeData ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></div>
           <p className="text-[10px] text-gray-500 font-mono">
             {error ? "DATA ERROR" : (realtimeData ? "MTA DATA LIVE" : "CONNECTING...")}
           </p>
        </div>
      </div>
    </div>
  );
};

export default TransitConnections;
