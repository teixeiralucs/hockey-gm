import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DndContext, DragOverlay, closestCenter, useDroppable, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { RosterSlot } from './RosterSlot';
import { PlayerCard } from './PlayerCard';
import { PlayerDetailsPanel } from './PlayerDetailsPanel';
import { useGameStore } from '../../../store/useGameStore';
import { Button } from '../../../components/Button';
import type { Player } from '../../../engine/models/Player';
import { Trash2, Wand2 } from 'lucide-react';
import './RosterView.css';
const BenchDroppable: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setNodeRef, isOver } = useDroppable({ id: 'bench' });
  return (
    <div ref={setNodeRef} className={`bench-section ${isOver ? 'bench-over' : ''}`}>
      {children}
    </div>
  );
};

export const RosterView: React.FC = () => {
  const { playerTeam, updateLines, clearLines, autoAssignLines } = useGameStore();
  const navigate = useNavigate();
  
  const [activePlayer, setActivePlayer] = useState<Player | null>(null);
  const [activeIsBench, setActiveIsBench] = useState<boolean>(false);
  const [activeLine, setActiveLine] = useState<number>(1);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Requer 5px de movimento para iniciar o drag (libera o onClick)
      },
    })
  );

  if (!playerTeam) return <div className="p-8 text-white">Loading Roster...</div>;

  const lines = playerTeam.lines;
  const bench = playerTeam.bench;

  const handleDragStart = (event: DragStartEvent) => {
    setActivePlayer(event.active.data.current?.player as Player);
    setActiveIsBench(!!event.active.data.current?.isBench);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActivePlayer(null);
    setActiveIsBench(false);
    const { active, over } = event;
    if (!over) return;

    const player = active.data.current?.player as Player;
    const isBenchSource = active.data.current?.isBench;
    const overId = over.id as string;

    if (isBenchSource && overId === 'bench') return;

    const newLines = JSON.parse(JSON.stringify(lines));
    let newBench = [...bench];

    const findSlotOfPlayer = (pId: string): string | null => {
      for (const line of Object.keys(newLines.forwards)) {
        if (newLines.forwards[line][0]?.id === pId) return `F-${line.replace('line', '')}-LW`;
        if (newLines.forwards[line][1]?.id === pId) return `F-${line.replace('line', '')}-C`;
        if (newLines.forwards[line][2]?.id === pId) return `F-${line.replace('line', '')}-RW`;
      }
      for (const line of Object.keys(newLines.defense)) {
        if (newLines.defense[line][0]?.id === pId) return `D-${line.replace('line', '')}-LD`;
        if (newLines.defense[line][1]?.id === pId) return `D-${line.replace('line', '')}-RD`;
      }
      if (newLines.goalies.starter?.id === pId) return `G-1-Starter`;
      if (newLines.goalies.backup?.id === pId) return `G-2-Backup`;
      return null;
    };

    const removePlayerFromSource = (pId: string) => {
      newBench = newBench.filter(p => p.id !== pId);
      Object.keys(newLines.forwards).forEach(line => {
        newLines.forwards[line] = newLines.forwards[line].map((p: any) => p?.id === pId ? null : p);
      });
      Object.keys(newLines.defense).forEach(line => {
        newLines.defense[line] = newLines.defense[line].map((p: any) => p?.id === pId ? null : p);
      });
      if (newLines.goalies.starter?.id === pId) newLines.goalies.starter = null;
      if (newLines.goalies.backup?.id === pId) newLines.goalies.backup = null;
    };

    const getPlayerInTarget = (targetId: string) => {
       if (targetId === 'bench') return null;
       const parts = targetId.split('-');
       if (parts[0] === 'F') {
         const lineNum = parts[1];
         const pos = parts[2];
         const idx = pos === 'LW' ? 0 : pos === 'C' ? 1 : 2;
         return newLines.forwards[`line${lineNum}`][idx];
       }
       if (parts[0] === 'D') {
         const lineNum = parts[1];
         const pos = parts[2];
         const idx = pos === 'LD' ? 0 : 1;
         return newLines.defense[`line${lineNum}`][idx];
       }
       if (parts[0] === 'G') {
         if (parts[1] === '1') return newLines.goalies.starter;
         if (parts[1] === '2') return newLines.goalies.backup;
       }
       return null;
    };

    const setPlayerInTarget = (targetId: string, p: Player | null) => {
       if (targetId === 'bench') {
         if (p) newBench.push(p);
         return;
       }
       const parts = targetId.split('-');
       if (parts[0] === 'F') {
         const lineNum = parts[1];
         const pos = parts[2];
         const idx = pos === 'LW' ? 0 : pos === 'C' ? 1 : 2;
         newLines.forwards[`line${lineNum}`][idx] = p;
       }
       if (parts[0] === 'D') {
         const lineNum = parts[1];
         const pos = parts[2];
         const idx = pos === 'LD' ? 0 : 1;
         newLines.defense[`line${lineNum}`][idx] = p;
       }
       if (parts[0] === 'G') {
         if (parts[1] === '1') newLines.goalies.starter = p;
         if (parts[1] === '2') newLines.goalies.backup = p;
       }
    };

    const sourceSlotId = isBenchSource ? 'bench' : findSlotOfPlayer(player.id);
    const targetPlayer = getPlayerInTarget(overId);
    
    // Clear the active player and target player from current locations
    removePlayerFromSource(player.id);
    if (targetPlayer) removePlayerFromSource(targetPlayer.id);

    // Place active player in target
    setPlayerInTarget(overId, player);
    
    // If target had a player, swap them to source
    if (targetPlayer && sourceSlotId) {
       setPlayerInTarget(sourceSlotId, targetPlayer);
    }
    
    updateLines(newLines, newBench);
  };

  return (
    <div className="roster-view">
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '16px' }}>
          

          <div className="roster-grid ice-rink" style={{ flex: 1 }}>
            
            {/* CSS Ice Rink Markings */}
            <div className="ice-red-line"></div>
            <div className="ice-blue-line-top"></div>
            <div className="ice-blue-line-bottom"></div>
            <div className="faceoff-circle top-left"></div>
            <div className="faceoff-circle top-right"></div>
            <div className="faceoff-circle bottom-left"></div>
            <div className="faceoff-circle bottom-right"></div>
            <div className="faceoff-circle center"></div>
            <div className="goal-crease top"></div>
            <div className="goal-crease bottom"></div>
            
            {/* Segmented Control - Top Left */}
            <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 20 }}>
              <div className="segmented-control" style={{ '--team-color': playerTeam.colors.primary } as React.CSSProperties}>
                {[1, 2, 3, 4].map(num => (
                  <button 
                    key={num}
                    className={`segment-btn ${activeLine === num ? 'active' : ''}`}
                    onClick={() => setActiveLine(num)}
                  >
                    {activeLine === num ? `Line ${num}` : num}
                  </button>
                ))}
              </div>
            </div>

            {/* Ações Rápidas Overlay */}
            <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 20, display: 'flex', gap: '8px' }}>
              <Button variant="secondary" onClick={clearLines} style={{ background: '#111114' }}>
                <Trash2 size={16} style={{ marginRight: '8px' }} /> CLEAR ALL
              </Button>
              <Button variant="primary" style={{ color: playerTeam.colors.primary, borderColor: playerTeam.colors.primary, boxShadow: `0 0 10px ${playerTeam.colors.primary}40`, backgroundColor: '#111114' }} onClick={autoAssignLines}>
                <Wand2 size={16} style={{ marginRight: '8px' }} /> AUTO ASSIGN
              </Button>
            </div>


            {/* Renderizar a Linha Ativa Espacialmente */}
            
            {/* Forwards */}
            <div className="rink-row" style={{ position: 'absolute', top: '20%', left: 0, width: '100%', height: 0, zIndex: 10 }}>
                <div style={{ position: 'absolute', left: '22%', top: 0, transform: 'translate(-50%, -50%)' }}>
                  <RosterSlot id={`F-${activeLine}-LW`} label="LW" expectedPos="LW" player={lines.forwards[`line${activeLine}` as keyof typeof lines.forwards][0]} onPlayerClick={setSelectedPlayer} />
                </div>
                <div style={{ position: 'absolute', left: '50%', top: 0, transform: 'translate(-50%, -50%)' }}>
                  <RosterSlot id={`F-${activeLine}-C`} label="C" expectedPos="C" player={lines.forwards[`line${activeLine}` as keyof typeof lines.forwards][1]} onPlayerClick={setSelectedPlayer} />
                </div>
                <div style={{ position: 'absolute', right: '22%', top: 0, transform: 'translate(50%, -50%)' }}>
                  <RosterSlot id={`F-${activeLine}-RW`} label="RW" expectedPos="RW" player={lines.forwards[`line${activeLine}` as keyof typeof lines.forwards][2]} onPlayerClick={setSelectedPlayer} />
                </div>
            </div>

            {/* Defense (Lines 1 to 3 only) */}
            {activeLine <= 3 && (
              <div className="rink-row" style={{ position: 'absolute', bottom: '20%', left: 0, width: '100%', height: 0, zIndex: 10 }}>
                  <div style={{ position: 'absolute', left: '22%', bottom: 0, transform: 'translate(-50%, 50%)' }}>
                    <RosterSlot id={`D-${activeLine}-LD`} label="LD" expectedPos="LD" player={lines.defense[`line${activeLine}` as keyof typeof lines.defense][0]} onPlayerClick={setSelectedPlayer} />
                  </div>
                  <div style={{ position: 'absolute', right: '22%', bottom: 0, transform: 'translate(50%, 50%)' }}>
                    <RosterSlot id={`D-${activeLine}-RD`} label="RD" expectedPos="RD" player={lines.defense[`line${activeLine}` as keyof typeof lines.defense][1]} onPlayerClick={setSelectedPlayer} />
                  </div>
              </div>
            )}

            {/* Goalies (Line 1 = Starter, Line 2 = Backup) */}
            {activeLine <= 2 && (
              <div className="rink-row" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 0, zIndex: 10 }}>
                  <div style={{ position: 'absolute', left: '50%', bottom: '85px', transform: 'translate(-50%, 50%)' }}>
                    <RosterSlot 
                      id={activeLine === 1 ? 'G-1-Starter' : 'G-2-Backup'} 
                      label={activeLine === 1 ? 'STARTER' : 'BACKUP'} 
                      expectedPos="G" 
                      player={activeLine === 1 ? lines.goalies.starter : lines.goalies.backup} 
                      onPlayerClick={setSelectedPlayer}
                    />
                  </div>
              </div>
            )}
          </div>
        </div>

        {selectedPlayer ? (
          <div className="bench-section details-mode">
            <PlayerDetailsPanel player={selectedPlayer} onBack={() => setSelectedPlayer(null)} />
          </div>
        ) : (
          <BenchDroppable>
            <div className="bench-panel-header">
              <h3 className="bench-panel-title">Bench</h3>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', fontWeight: 600 }}>{bench.length} PLAYERS</span>
            </div>
            <div className="bench-scroll-area">
              <div className="bench-grid">
                {bench.map(p => (
                  <PlayerCard key={p.id} player={p} isBench onClick={() => setSelectedPlayer(p)} />
                ))}
                {bench.length === 0 && <span className="text-gray-500">No players on bench</span>}
              </div>
            </div>
          </BenchDroppable>
        )}

        <DragOverlay dropAnimation={null}>
          {activePlayer ? <PlayerCard player={activePlayer} isBench={activeIsBench} /> : null}
        </DragOverlay>

      </DndContext>
    </div>
  );
};
