let gameState = {
    players: [
        { id: '1', name: 'A', location: 'bench' },
        { id: '2', name: 'B', location: 'bench' },
        { id: '1', name: 'A', location: 'cpu_bench' } // Duplicate from CPU
    ]
};

let draggedPlayerId = '1';

const draggedPlayer = gameState.players.find(p => p.id === draggedPlayerId);
console.log("Found:", draggedPlayer.name);

gameState.players = gameState.players.filter(p => p.id !== draggedPlayerId);
console.log("Remaining:", gameState.players);
