"use client";

import React from "react";
import CountUp from "react-countup";
import { formatPace, formatDuration } from "@/lib/utils";
import { Flame, Timer, Activity, Footprints, Bike } from "lucide-react";

type RunVisualizerProps = {
  activityType: "RUN" | "WALK" | "CYCLE";
  distanceKm: number;
  durationSeconds: number;
  avgPaceMinPerKm: number | null;
  caloriesBurned: number;
};

export function RunVisualizer({ activityType, distanceKm, durationSeconds, avgPaceMinPerKm, caloriesBurned }: RunVisualizerProps) {
  // Calculate width based on distance (cap at 100%)
  const maxExpectedDistance = activityType === "CYCLE" ? 40 : 15;
  const widthPercent = Math.min(100, Math.max(10, (distanceKm / maxExpectedDistance) * 100));

  // Hue goes from 120 (Green) to 0 (Red) based on widthPercent
  const hue = Math.max(0, 120 - (widthPercent * 1.2));

  return (
    <div className="px-4 pt-5 pb-3 flex flex-col gap-3">

      {/* The Stats */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
            <Footprints className="w-3 h-3" /> Dist
          </span>
          <span className="font-display font-bold text-lg text-white">
            <CountUp end={distanceKm} decimals={2} duration={2.5} />
            <span className="text-xs text-white/50 ml-0.5 font-sans font-normal">km</span>
          </span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
            <Activity className="w-3 h-3" /> Pace
          </span>
          <span className="font-display font-bold text-lg text-white">
            {formatPace(avgPaceMinPerKm)}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
            <Timer className="w-3 h-3" /> Time
          </span>
          <span className="font-display font-bold text-lg text-white">
            {formatDuration(durationSeconds)}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
            <Flame className="w-3 h-3 text-ignite" /> Cals
          </span>
          <span className="font-display font-bold text-lg text-white">
            <CountUp end={caloriesBurned} duration={2.5} />
          </span>
        </div>
      </div>
    </div>
  );
}
