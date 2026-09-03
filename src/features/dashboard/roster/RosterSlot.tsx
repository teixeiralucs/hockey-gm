import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { PlayerCard } from './PlayerCard';
import type { Player } from '../../../engine/models/Player';
import './RosterSlot.css';

interface RosterSlotProps {
  id: string; // ex: "F-1-LW"
  label: string; // ex: "LW1"
  player: Player | null;
  expectedPos: string;
  onPlayerClick?: (player: Player) => void;
}

export const RosterSlot: React.FC<RosterSlotProps> = ({ id, label, player, expectedPos, onPlayerClick }) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: { expectedPos }
  });

  return (
    <div 
      ref={setNodeRef}
      className={`roster-slot ${isOver ? 'is-over' : ''} ${!player ? 'empty' : ''}`}
    >
      <div className="slot-label">{label}</div>
      {player ? (
        <PlayerCard player={player} onClick={onPlayerClick ? () => onPlayerClick(player) : undefined} />
      ) : (
        <div className="empty-placeholder">
          {expectedPos}
        </div>
      )}
    </div>
  );
};
