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
};

const ACTIVITY_ICON = { RUN: Footprints, WALK: Footprints, CYCLE: Bike };

export function RunVisualizer({ activityType, distanceKm, durationSeconds, avgPaceMinPerKm, caloriesBurned }: RunVisualizerProps) {
  const Icon = ACTIVITY_ICON[activityType] || Footprints;
  
  // Calculate width based on distance (cap at 100%)
  const maxExpectedDistance = activityType === "CYCLE" ? 40 : 15;
  const widthPercent = Math.min(100, Math.max(10, (distanceKm / maxExpectedDistance) * 100));
  
  // Hue goes from 120 (Green) to 0 (Red) based on widthPercent
  const hue = Math.max(0, 120 - (widthPercent * 1.2));

  return (
    <div className="flex flex-col relative w-full pt-6 pb-5 px-4 overflow-hidden">
      
      {/* Absolute faint background glow */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] blur-3xl opacity-[0.06] rounded-full mix-blend-screen pointer-events-none transition-colors duration-1000"
        style={{ backgroundColor: `hsl(${hue}, 100%, 60%)` }}
      />
      
      {/* Hero Metric: Distance */}
      <div className="relative flex flex-col items-center justify-center mb-6">
        <div className="flex items-center gap-1.5 mb-1 text-momentum/80 font-medium text-xs tracking-widest uppercase">
          <Icon className="w-4 h-4" />
          {activityType}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-display font-bold text-6xl text-white tracking-tighter shadow-black/50 drop-shadow-lg">
            <CountUp end={distanceKm} decimals={2} duration={2.5} />
          </span>
          <span className="text-xl font-medium text-white/50">km</span>
        </div>
      </div>
      
      {/* The Data Shelf: Glassmorphism Pill */}
      <div className="relative flex items-center justify-between bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl px-5 py-4 shadow-xl">
        <div className="flex flex-col items-center flex-1 border-r border-white/10">
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-1 flex items-center gap-1">
            <Activity className="w-3 h-3" /> Pace
          </span>
          <span className="font-sans font-medium text-base text-white">
            {formatPace(avgPaceMinPerKm)}
          </span>
        </div>

        <div className="flex flex-col items-center flex-1 border-r border-white/10">
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-1 flex items-center gap-1">
            <Timer className="w-3 h-3" /> Time
          </span>
          <span className="font-sans font-medium text-base text-white">
            {formatDuration(durationSeconds)}
          </span>
        </div>

        <div className="flex flex-col items-center flex-1">
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-1 flex items-center gap-1">
            <Flame className="w-3 h-3 text-ignite/80" /> Cals
          </span>
          <span className="font-sans font-medium text-base text-white">
            <CountUp end={caloriesBurned} duration={2.5} />
          </span>
        </div>
      </div>
    </div>
  );
}
