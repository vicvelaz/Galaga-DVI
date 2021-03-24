
////////////////////////////////////////
// Objeto SPRITE
////////////////////////////////////////
var Sprite = function () { }

Sprite.prototype.setup = function (sprite, props) {
    this.sprite = sprite;
    this.merge(props);
    this.frame = this.frame || 0;
    this.w = SpriteSheet.map[sprite].w;
    this.h = SpriteSheet.map[sprite].h;
}

Sprite.prototype.merge = function (props) {
    if (props) {
        for (var prop in props) {
            this[prop] = props[prop];
        }
    }
}

Sprite.prototype.draw = function (ctx) {
    SpriteSheet.draw(ctx, this.sprite, this.x, this.y, this.frame);
}

Sprite.prototype.hit = function (damage) {
    this.board.remove(this);
}

var OBJECT_PLAYER = 1,
    OBJECT_PLAYER_PROJECTILE = 2,
    OBJECT_ENEMY = 4,
    OBJECT_ENEMY_PROJECTILE = 8,
    OBJECT_POWERUP = 16;




////////////////////////////////////////
// Objeto del jugador principal
////////////////////////////////////////
var PlayerShip = function () {
    this.setup('ship', { vx: 0, frame: 0, reloadTime: 0.25, maxVel: 200 });
    this.x = Game.width / 2 - this.w / 2;
    this.y = Game.height - Game.playerOffset - this.h;
    this.reload = this.reloadTime;
}
PlayerShip.prototype = new Sprite();
PlayerShip.prototype.type = OBJECT_PLAYER;
PlayerShip.prototype.step = function (dt) {
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
PlayerShip.prototype.hit = function (damage) {
    if (this.board.remove(this)) {
        loseGame();
    }
}

///////////////////////////////////////////
//Objeto que maneja los proyectiles del jugador
///////////////////////////////////////////
var PlayerMissile = function (x, y) {
    this.setup('missile', { vy: -700, damage: 10 });
    this.x = x - this.w / 2;
    this.y = y - this.h;
};

PlayerMissile.prototype = new Sprite();
PlayerMissile.prototype.type = OBJECT_PLAYER_PROJECTILE;

PlayerMissile.prototype.step = function (dt) {
    this.y += this.vy * dt;
    var collision = this.board.collide(this, OBJECT_ENEMY);
    if (collision) {
        collision.hit(this.damage);
        this.board.remove(this);
    } else if (this.y < -this.h) {
        this.board.remove(this);
    }
    if (this.y < -this.h) { this.board.remove(this); }
};



///////////////////////////////////////////
// Objeto que maneja las naves enemigas
///////////////////////////////////////////
var Enemy = function (blueprint, override) {
    this.merge(this.baseParameters);
    this.setup(blueprint.sprite, blueprint);
    this.merge(override);
}

Enemy.prototype = new Sprite();
Enemy.prototype.type = OBJECT_ENEMY;
Enemy.prototype.baseParameters = {
    A: 0, B: 0, C: 0, D: 0,
    E: 0, F: 0, G: 0, H: 0,
    t: 0
};

Enemy.prototype.step = function (dt) {
    this.t += dt;
    this.vx = this.A + this.B * Math.sin(this.C * this.t + this.D);
    this.vy = this.E + this.F * Math.sin(this.G * this.t + this.H);
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    var collision = this.board.collide(this, OBJECT_PLAYER);
    if (collision) {
        collision.hit(this.damage);
        this.board.remove(this);
    }
    if (this.y > Game.height ||
        this.x < -this.w ||
        this.x > Game.width) {
        this.board.remove(this);
    }
}

Enemy.prototype.hit = function (damage) {
    this.health -= damage;
    if (this.health <= 0)
        this.board.remove(this);
}


///////////////////////////////////////////
// Objeto que maneja la animación de la explisión de las naves
///////////////////////////////////////////
var Explosion = function (centerX, centerY) {
    this.setup('explosion', { frame: 0 });
    this.x = centerX - this.w / 2;
    this.y = centerY - this.h / 2;
    this.subFrame = 0;
};
Explosion.prototype = new Sprite();
Explosion.prototype.step = function (dt) {
    this.frame = Math.floor(this.subFrame++ / 3);
    if (this.subFrame >= 36) {
        this.board.remove(this);
    }
};

Enemy.prototype.hit = function (damage) {
    this.health -= damage;
    if (this.health <= 0) {
        if (this.board.remove(this)) {
            this.board.add(new Explosion(this.x + this.w / 2,
                this.y + this.h / 2));
        }
    }
}


///////////////////////////////////////////
// Objeto que maneja los niveles
///////////////////////////////////////////
var Level = function (levelData, callback) {
    this.levelData = [];
    for (var i = 0; i < levelData.length; i++) {
        this.levelData.push(Object.create(levelData[i]));
    }
    this.t = 0;
    this.callback = callback;
}

Level.prototype.draw = function (ctx) { }
Level.prototype.step = function (dt) {
    var idx = 0, remove = [], curShip = null;
    // Update the current time offset
    this.t += dt * 1000;
    // Example levelData
    // Start, End, Gap, Type, Override
    // [[ 0, 4000, 500, 'step', { x: 100 } ]
    while ((curShip = this.levelData[idx]) &&
        (curShip[0] < this.t + 2000)) {
        // Check if past the end time
        if (this.t > curShip[1]) {
            // If so, remove the entry
            remove.push(curShip);
        } else if (curShip[0] < this.t) {
            // Get the enemy definition blueprint
            var enemy = enemies[curShip[3]],
                override = curShip[4];
            // Add a new enemy with the blueprint and override
            this.board.add(new Enemy(enemy, override));
            // Increment the start time by the gap
            curShip[0] += curShip[2];
        }
        idx++;
    }
    // Remove any objects from the levelData that have passed
    for (var i = 0, len = remove.length; i < len; i++) {
        var idx = this.levelData.indexOf(remove[i]);
        if (idx != -1) this.levelData.splice(idx, 1);
    }
    // If there are no more enemies on the board or in
    // levelData, this level is done
    if (this.levelData.length == 0 && this.board.cnt[OBJECT_ENEMY] == 0) {
        if (this.callback) this.callback();
    }
}


///////////////////////////////////////////
// Objeto que maneja las estadisticas
///////////////////////////////////////////
var analytics = new function () {
    var lastDate = Date.now();
    var time = 0;
    var frames = 0;
    var fps = 0;
    this.step = function (dt) {
        var now = Date.now();
        //Ignoramos el dt que nos indica el método loop()
        var dt = (now - lastDate);
        lastDate = now;
        time += dt;
        ++frames;
        fps = frames * 1000 / time;
        if (time > 5000) {
            time = 0;
            frames = 0;
        }
    }
    this.draw = function (ctx) {
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "left";
        ctx.font = "bold 16px arial";
        ctx.fillText(Math.round(fps * 100) / 100, 0, 20);
    }
}



///////////////////////////////////////////
// Objeto que maneja las estrellas del fondo
///////////////////////////////////////////
var Starfield = function (speed, opacity, numStars, clear) {
    // Set up the offscreen canvas
    var stars = document.createElement("canvas");
    stars.width = Game.width;
    stars.height = Game.height;
    var starCtx = stars.getContext("2d");
    var offset = 0;
    // If the clear option is set,
    // make the background black instead of transparent
    if (clear) {
        starCtx.fillStyle = "#000";
        starCtx.fillRect(0, 0, stars.width, stars.height);
    }
    // Now draw a bunch of random 2 pixel
    // rectangles onto the offscreen canvas
    starCtx.fillStyle = "#FFF";
    starCtx.globalAlpha = opacity;
    for (var i = 0; i < numStars; i++) {
        starCtx.fillRect(Math.floor(Math.random() * stars.width),
            Math.floor(Math.random() * stars.height),
            2,
            2);
    }
    // This method is called every frame
    // to draw the starfield onto the canvas
    this.draw = function (ctx) {
        var intOffset = Math.floor(offset);
        var remaining = stars.height - intOffset;
        // Draw the top half of the starfield
        if (intOffset > 0) {
            ctx.drawImage(stars,
                0, remaining,
                stars.width, intOffset,
                0, 0,
                stars.width, intOffset);
        }
        // Draw the bottom half of the starfield
        if (remaining > 0) {
            ctx.drawImage(stars, 0, 0,
                stars.width, remaining,
                0, intOffset,
                stars.width, remaining);
        }
    };
    // This method is called to update
    // the starfield
    this.step = function (dt) {
        offset += dt * speed;
        offset = offset % stars.height;
    };
};