
////////////////////////////////////////
// Objeto que maneja la lógica del juego
////////////////////////////////////////
var Game = new function () {
    // Inicialización del juego
    // se obtiene el canvas, se cargan los recursos y se llama a callback
    this.initialize = function (canvasElementId, sprite_data, callback) {
        this.canvas = document.getElementById(canvasElementId)
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.ctx = this.canvas.getContext && this.canvas.getContext('2d');
        if (!this.ctx) {
            return alert("Please upgrade your browser to play");
        }
        this.setupInput();
        this.loop();
        SpriteSheet.load(sprite_data, callback);
    };


    // le asignamos un nombre lógico a cada tecla que nos interesa
    var KEY_CODES = { 37: 'left', 39: 'right', 32: 'fire' };
    this.keys = {};
    this.setupInput = function () {
        window.addEventListener('keydown', function (e) {
            if (KEY_CODES[e.keyCode]) {
                Game.keys[KEY_CODES[e.keyCode]] = true;
                e.preventDefault();
            }
        }, false);
        window.addEventListener('keyup', function (e) {
            if (KEY_CODES[e.keyCode]) {
                Game.keys[KEY_CODES[e.keyCode]] = false;
                e.preventDefault();
            }
        }, false);
    }

    var boards = [];

    this.loop = function () {
        var fps = 60;
        var dt = 1000 / fps;
        // Cada pasada borramos el canvas
        Game.ctx.fillStyle = "#000";
        Game.ctx.fillRect(0, 0, Game.width, Game.height);
        // y actualizamos y dibujamos todas las entidades
        for (var i = 0, len = boards.length; i < len; i++) {
            if (boards[i]) {
                boards[i].step(dt / 1000.0);
                boards[i].draw(Game.ctx);
            }
        }
        setTimeout(Game.loop, dt);
    };

    // Change an active game board
    this.setBoard = function (num, board) { boards[num] = board; };
};



////////////////////////////////////////
// Objeto que maneja la hoja de sprites
////////////////////////////////////////
var SpriteSheet = new function () {
    this.map = {};
    this.load = function (spriteData, callback) {
        this.map = spriteData;
        this.image = new Image();
        this.image.onload = callback;
        this.image.src = 'img/sprites.png';
    };
    this.draw = function (ctx, sprite, x, y, frame) {
        var s = this.map[sprite];
        if (!frame) frame = 0;
        ctx.drawImage(this.image,
            s.sx + frame * s.w,
            s.sy,
            s.w, s.h,
            x, y,
            s.w, s.h);
    };
}


////////////////////////////////////////
// Objeto que maneja la pantalla de título
////////////////////////////////////////
var TitleScreen = function TitleScreen(title, subtitle, callback) {
    var up = false;
    this.step = function (dt) {
        if (!Game.keys['fire']) up = true;
        if (up && Game.keys['fire'] && callback) callback();
    };
    this.draw = function (ctx) {
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        ctx.font = "bold 40px bangers";
        ctx.fillText(title, Game.width / 2, Game.height / 2);
        ctx.font = "bold 20px bangers";
        ctx.fillText(subtitle, Game.width / 2, Game.height / 2 + 140);
    };
};

////////////////////////////////////////
// Objeto del jugador principal
////////////////////////////////////////
var PlayerShip = function () {
    this.w = SpriteSheet.map['ship'].w;
    this.h = SpriteSheet.map['ship'].h;
    this.x = Game.width / 2 - this.w / 2;
    this.y = Game.height - 10 - this.h;
    this.vx = 0;
    this.maxVel = 200;

    this.reloadTime = 0.15; // un cuarto de segundo
    this.reload = this.reloadTime;

    this.step = function (dt) {
        if (Game.keys['left']) { this.vx = -this.maxVel; }
        else if (Game.keys['right']) { this.vx = this.maxVel; }
        else { this.vx = 0; }
        this.x += this.vx * dt;
        if (this.x < 0) { this.x = 0; }
        else if (this.x > Game.width - this.w) {
            this.x = Game.width - this.w
        }

        this.reload -= dt;
        if (Game.keys['fire'] && this.reload < 0) {
            Game.keys['fire'] = false;
            this.reload = this.reloadTime;
            this.board.add(new PlayerMissile(this.x, this.y + this.h / 2));
            this.board.add(new PlayerMissile(this.x + this.w, this.y + this.h / 2));
        }

    }
    this.draw = function (ctx) {
        SpriteSheet.draw(ctx, 'ship', this.x, this.y, 0);
    }
}


////////////////////////////////////////
// Tablero del juego 
////////////////////////////////////////
var OBJECT_PLAYER = 1,
    OBJECT_PLAYER_PROJECTILE = 2,
    OBJECT_ENEMY = 4,
    OBJECT_ENEMY_PROJECTILE = 8,
    OBJECT_POWERUP = 16;

var GameBoard = function () {
    var board = this;
    // The current list of objects
    this.objects = [];
    this.cnt = {};
    // Add a new object to the object list
    this.add = function (obj) {
        obj.board = this;
        this.objects.push(obj);
        this.cnt[obj.type] = (this.cnt[obj.type] || 0) + 1;
        return obj;
    };

    // Reset the list of removed objects
    this.resetRemoved = function () { this.removed = []; };
    // Mark an object for removal
    this.remove = function (obj) {
        var idx = this.removed.indexOf(obj);
        if (idx == -1) {
            this.removed.push(obj);
            return true;
        } else {
            return false;
        }
    };

    // Removed an objects marked for removal from the list
    this.finalizeRemoved = function () {
        for (var i = 0, len = this.removed.length; i < len; i++) {
            var idx = this.objects.indexOf(this.removed[i]);
            if (idx != -1) {
                this.cnt[this.removed[i].type]--;
                this.objects.splice(idx, 1);
            }
        }
    };
    // Call the same method on all current objects
    this.iterate = function (funcName) {
        var args = Array.prototype.slice.call(arguments, 1);
        for (var i = 0, len = this.objects.length; i < len; i++) {
            var obj = this.objects[i];
            obj[funcName].apply(obj, args);
        }
    };
    // Find the first object for which func is true
    this.detect = function (func) {
        for (var i = 0, val = null, len = this.objects.length; i < len; i++) {
            if (func.call(this.objects[i])) return this.objects[i];
        }
        return false;
    };

    // Call step on all objects and them delete
    // any object that have been marked for removal
    this.step = function (dt) {
        this.resetRemoved();
        this.iterate('step', dt);
        this.finalizeRemoved();
    };

    // Draw all the objects
    this.draw = function (ctx) {
        this.iterate('draw', ctx);
    };

    this.overlap = function (o1, o2) {
        return !((o1.y + o1.h - 1 < o2.y) || (o1.y > o2.y + o2.h - 1) ||
            (o1.x + o1.w - 1 < o2.x) || (o1.x > o2.x + o2.w - 1));
    };

    this.collide = function (obj, type) {
        return this.detect(function () {
            if (obj != this) {
                var col = (!type || this.type & type) && board.overlap(obj, this);
                return col ? this : false;
            }
        });
    };
}


///////////////////////////////////////////
//Objeto que maneja los proyectiles del jugador
///////////////////////////////////////////
var PlayerMissile = function (x, y) {
    this.w = SpriteSheet.map['missile'].w;
    this.h = SpriteSheet.map['missile'].h;
    // El misil aparece centrado en 'x'
    this.x = x - this.w / 2;
    // Con la parte inferior del misil en 'y'
    this.y = y - this.h;
    this.vy = -700;
};

PlayerMissile.prototype.step = function (dt) {
    this.y += this.vy * dt;
    var collision = this.board.collide(this, OBJECT_ENEMY);
    if (collision) {
       this.board.remove(this);
        this.board.remove(collision);
    }
    if (this.y < -this.h) { this.board.remove(this); }
};

PlayerMissile.prototype.draw = function (ctx) {
    SpriteSheet.draw(ctx, 'missile', this.x, this.y);
};


///////////////////////////////////////////
//Objeto que maneja las naves enemigas
///////////////////////////////////////////
var Enemy = function (blueprint, override) {
    var baseParameters = {
        A: 0, B: 0, C: 0, D: 0,
        E: 0, F: 0, G: 0, H: 0
    }
    // Se inicializan todos los parámetros a 0
    for (var prop in baseParameters) {
        this[prop] = baseParameters[prop];
    }
    // Se copian los atributos del blueprint
    for (prop in blueprint) {
        this[prop] = blueprint[prop];
    }
    // Se copian los atributos redefinidos, si los hay
    if (override) {
        for (prop in override) {
            this[prop] = override[prop];
        }
    }
    this.w = SpriteSheet.map[this.sprite].w;
    this.h = SpriteSheet.map[this.sprite].h;
    this.t = 0;
    this.type = OBJECT_ENEMY;

    Enemy.prototype.step = function (dt) {
        this.t += dt;
        this.vx = this.A + this.B * Math.sin(this.C * this.t + this.D);
        this.vy = this.E + this.F * Math.sin(this.G * this.t + this.H);
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (this.y > Game.height ||
            this.x < -this.w ||
            this.x > Game.width) {
            this.board.remove(this);
        }
    }
    Enemy.prototype.draw = function (ctx) {
        SpriteSheet.draw(ctx, this.sprite, this.x, this.y);
    }
};