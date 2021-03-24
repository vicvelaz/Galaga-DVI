var sprites = {
    ship: { sx: 0, sy: 0, w: 37, h: 42, frames: 1 },
    missile: { sx: 0, sy: 30, w: 2, h: 10, frames: 1 },
    enemy_purple: { sx: 37, sy: 0, w: 42, h: 43, frames: 1 },
    enemy_bee: { sx: 79, sy: 0, w: 37, h: 43, frames: 1 },
    enemy_ship: { sx: 116, sy: 0, w: 42, h: 43, frames: 1 },
    enemy_circle: { sx: 158, sy: 0, w: 32, h: 33, frames: 1 },
    explosion: { sx: 0, sy: 64, w: 64, h: 64, frames: 12 }
};

var enemies = {
    straight: {
        x: 0, y: -50, sprite: 'enemy_ship', health: 10,
        E: 100
    },
    ltr: {
        x: 0, y: -100, sprite: 'enemy_purple', health: 10,
        B: 200, C: 1, E: 200
    },
    circle: {
        x: 400, y: -50, sprite: 'enemy_circle', health: 10,
        A: 0, B: -200, C: 1, E: 20, F: 200, G: 1, H: Math.PI / 2
    },
    wiggle: {
        x: 100, y: -50, sprite: 'enemy_bee', health: 20,
        B: 100, C: 4, E: 100
    },
    step: {
        x: 0, y: -50, sprite: 'enemy_circle', health: 10,
        B: 300, C: 1.5, E: 60
    }
};

var level1 = [
    // Start, End, Gap, Type, Override
    [0, 4000, 500, 'step'],
    [6000, 13000, 800, 'ltr'],
    [12000, 16000, 400, 'circle'],
    [18200, 20000, 500, 'straight', { x: 150 }],
    [18200, 20000, 500, 'straight', { x: 100 }],
    [18400, 20000, 500, 'straight', { x: 200 }],
    [22000, 25000, 400, 'wiggle', { x: 300 }],
    [22000, 25000, 400, 'wiggle', { x: 200 }]
];

function startGame() {
    Game.setBoard(3, new TitleScreen("Alien Invasion",
        "Press fire to start playing",
        playGame));
}

var playGame = function () {
    var board = new GameBoard();
    board.add(new PlayerShip());
    board.add(new Level(level1, winGame));
    Game.setBoard(0, new Starfield(20, 0.4, 100, true))
    Game.setBoard(1, new Starfield(50, 0.6, 100))
    Game.setBoard(2, new Starfield(100, 1.0, 50)); 
    Game.setBoard(3, board);
    Game.setBoard(10, analytics);
};

var winGame = function () {
    Game.setBoard(3, new TitleScreen("You win!",
        "Press fire to play again",
        playGame));
};
var loseGame = function () {
    Game.setBoard(3, new TitleScreen("You lose!",
        "Press fire to play again",
        playGame));
};

// Indica que se llame al método de inicialización una vez
// se haya terminado de cargar la página HTML
// y este después de realizar la inicialización llamará a
// startGame
window.addEventListener("load", function () {
    Game.initialize("game", sprites, startGame);
});


