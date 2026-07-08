"use client";

import React from "react";
import CountUp from "react-countup";
import { formatPace, formatDuration } from "@/lib/utils";
import { Timer, Activity, Footprints, Bike, Flame } from "lucide-react";

type RunVisualizerProps = {
  activityType: "RUN" | "WALK" | "CYCLE";
  distanceKm: number;
  durationSeconds: number;
  avgPaceMinPerKm: number | null;
  caloriesBurned: number;
  caption?: string | null;
};

const ACTIVITY_ICON = { RUN: Footprints, WALK: Footprints, CYCLE: Bike };

export function RunVisualizer({ activityType, distanceKm, durationSeconds, avgPaceMinPerKm, caloriesBurned, caption }: RunVisualizerProps) {
  const Icon = ACTIVITY_ICON[activityType] || Footprints;
  
  // Calculate width based on distance (cap at 100%)
  const maxExpectedDistance = activityType === "CYCLE" ? 40 : 15;
  const widthPercent = Math.min(100, Math.max(10, (distanceKm / maxExpectedDistance) * 100));
  
  // Hue goes from 120 (Green) to 0 (Red) based on widthPercent
  const hue = Math.max(0, 120 - (widthPercent * 1.2));

  return (
    <div className="flex flex-col relative w-full pt-6 pb-2 overflow-hidden">
      
      {/* Hero Metrics: Distance, Pace & Time */}
      <div className="relative flex items-center justify-between gap-4 mb-4 px-1">
        
        {/* Distance */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 mb-1 text-momentum/80 font-medium text-xs tracking-widest uppercase">
            <Icon className="w-4 h-4" />
            Dist
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="font-display font-bold text-4xl md:text-5xl text-white tracking-tighter shadow-black/50 drop-shadow-lg">
              <CountUp end={distanceKm} decimals={2} duration={2.5} />
            </span>
            <span className="text-sm font-medium text-white/50 mb-1">km</span>
          </div>
        </div>

        {/* Pace */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 mb-1 text-ignite/80 font-medium text-xs tracking-widest uppercase">
            <Activity className="w-4 h-4" />
            Pace
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="font-display font-bold text-4xl md:text-5xl text-white tracking-tighter shadow-black/50 drop-shadow-lg">
              {formatPace(avgPaceMinPerKm)}
            </span>
            <span className="text-sm font-medium text-white/50 mb-1">/km</span>
          </div>
        </div>

        {/* Time */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 mb-1 text-blue-400/90 font-medium text-xs tracking-widest uppercase">
            <Timer className="w-4 h-4" />
            Time
          </div>
          <span className="font-display font-bold text-4xl md:text-5xl text-white tracking-tighter shadow-black/50 drop-shadow-lg">
            {formatDuration(durationSeconds)}
          </span>
        </div>

      </div>
      
      {/* The Data Shelf: Glassmorphism Brutalist Box */}
      <div className="relative flex items-center justify-between bg-white/[0.03] backdrop-blur-xl border-[3px] border-border-ichor rounded-none px-5 py-5 shadow-[6px_6px_0_var(--ichor-border)] mt-2">
        <div className="flex-1 pr-4 min-w-0">
          {caption ? (
            <p className="text-[18px] font-bold text-white leading-snug break-words">{caption}</p>
          ) : (
            <p className="text-sm italic text-white/40 font-semibold">No description</p>
          )}
        </div>

        <div className="flex flex-col items-end pl-4 border-l-[3px] border-border-ichor shrink-0">
          <span className="text-[11px] text-white/50 uppercase tracking-widest font-bold flex items-center gap-1 mb-1">
            <Flame className="w-3.5 h-3.5 text-ignite" /> Cals
          </span>
          <span className="font-display font-bold text-2xl text-white">
            <CountUp end={caloriesBurned} duration={2.5} />
          </span>
        </div>
      </div>
    </div>
  );
}
