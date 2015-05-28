"use strict";


//////////////////////////////////////////////////
//    Snake Game v1, by Youssouf
//    --------------------------------
//    Description: This is a snake game where you controle a snake
//            with directionnal keys (up, down, left, right)
//            in order to eat food.
//
//    Tools used: The game was made with 
//                HTML5 (Javascript, HTML and some CSS)
//                with Brackets text editor.
//
//    Game sounds where taken from https://freesound.org,
//    Sound files were converted to mp3 using SoundConverter 1.5.4,
//    some were modified with audacity;
//    Graphics (apple drawing and the bird) were made using Gimp.
//
//    Fill free to use/modify it, but keep my name or e-mail accessible
//    and included with it as i am the original author, dont forget to mention
//    where the sound files comes from (if you keep them).
//
//    Feedback or critics about how i made it are welcome.
//    Contact: nzomedia2@gmail.com
//    Date: May 2015
//////////////////////////////////////////////////

  
var can = document.getElementById("game_board");

if(can == undefined){
    throw new Error("Can't find game board (canvas).");
}
var ctx = can.getContext("2d");
ctx.lineWidth = 5;


//we store the highest score:
if(sessionStorage.getItem("snake_game_hi_score") == undefined)
    sessionStorage.setItem("snake_game_hi_score", "0");
      
 
//Function to draw some text on the canvas.
function show_message(msg, font_specs, posX, posY){
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = (font_specs["fillStyle"] == undefined)? "#b6ffff" : font_specs["fillStyle"];
    ctx.lineWidth = 5;
    ctx.strokeStyle = (font_specs["strokeStyle"] == undefined)? "#10d3db" : font_specs["strokeStyle"];

    font_specs["family"] = (font_specs["family"] == undefined)? "Monospace":font_specs["family"];
    ctx.font = font_specs["size"] + " " + font_specs["family"];
    ctx.textAlign = (font_specs["textAlign"] == undefined)? "center":font_specs["textAlign"];
    ctx.textBaseline = font_specs["textBaseline"];

    //Default values for posX and posY are set to be at the center:
    posX = (posX == undefined)? can.width/2: posX;
    posY = (posY == undefined)? can.height/2: posY;

    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#a7ff00";
    ctx.strokeText(msg, posX, posY);
    ctx.fillText(msg, posX, posY);
    ctx.stroke();
    ctx.fill();
    ctx.restore();
}
    
//HTML node elements:
var $score = document.getElementById("snake_game_score");
var score = 0;
var $hi_score = document.getElementById("snake_game_hi_score");
var hi_score = parseInt(sessionStorage.getItem("snake_game_hi_score"));
$hi_score.innerHTML = hi_score;

//Constants:
//Folowing 2 constants tell how much cells we have in the game board:
    //a cell is the distance the snake moves at each frame.
    //Food is also placed at random cells:
var NB_VERTICAL_CELL = 20;
var NB_HORIZONTAL_CELL = 20;

var SNAKE_DEFAULT_SIZE = 6;  //Snake default number of cells.
var MAX_LEVEL = 15;          //There's 15 levels, they affect the animation period by reducing it.
var DEFAULT_PERIOD = 250;    //The time it takes the snake to move at game begining.
var MIN_PERIOD = 50;         //The time it will take the snake to move once at the final level.
var PERIOD_DIFFRENCE = (DEFAULT_PERIOD-MIN_PERIOD)/MAX_LEVEL;
var LEVEL = 1; 
var $level = document.getElementById("snake_game_level");
$level.innerHTML = LEVEL;
var REQUIRED_FOOD = 10; //The amount of food the snake must it to pass a level.
var FOOD_EATEN = 0; //Counts food eaten by the snake before passing a level.


//Your chance to have a bonus food to eat:
var BONUS_FOOD_CHANCE = REQUIRED_FOOD;
//Bonus food value:
var BONUS_FOOD_VALUE = 10;

//Sound effects:
var food_eaten_sound = document.getElementById("apple_crunch_audio");
var snake_accident_sound = document.getElementById("cracking_audio");
var level_up_sound = document.getElementById("coin_audio");
var background_sound = document.getElementById("background_audio");

//Activate or disable sound playback using a checkbox:
var toggle_sound_cb = document.getElementById("snake_game_toggle_sound_cb");
toggle_sound_cb.onchange = function(){
    if(this.checked == true){
        food_eaten_sound.muted = false;
        snake_accident_sound.muted = false;
        level_up_sound.muted = false;
        background_sound.muted = false;
    }
    else{
        food_eaten_sound.muted = true;
        snake_accident_sound.muted = true;
        level_up_sound.muted = true;
        background_sound.muted = true;
    }
}
    
//The snake:
var snake = null;
//Food:
var food = null;

//Visual helpers delimit cells grid,
//this function draws them:
//If you want to maintain the helpers visible,
//call this function in the animator's job list.
function drawVisualHelpers(){
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.strokeStyle = "#eee";
    for(var i = 0; i < NB_VERTICAL_CELL; i++){
        var y = i*can.height/NB_VERTICAL_CELL;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(can.width, y);
        ctx.stroke();
    }
    for(var j = 0; j < NB_HORIZONTAL_CELL; j++){
        var x = can.width/NB_HORIZONTAL_CELL;
            ctx.beginPath();
            ctx.moveTo(j*x, 0);
            ctx.lineTo(j*x, can.height);
        ctx.stroke();
    }
    ctx.restore();
}


//The snake's body is an array of cells:
var CELL_WIDTH = can.width/NB_HORIZONTAL_CELL;
var CELL_HEIGHT = can.height/NB_VERTICAL_CELL;

//Snake prototype:
function Snake(_initial_size, _speed){
    this.size = _initial_size;
    this.speed = _speed;
    this.body = []; //An array of the snake body segments.
    this.dir = "right"; //Initial direction of the snake.

    //The snake enters on the game board from the left-top corner:
    //We draw the head first as the first segment, and the rest of 
    //it's body follows, from right to left.
    for(var i = 0; i >= -1*(this.size-1); --i){
        this.body.push({x: i, y:0});
    }

    this.draw = function(){
        //We draw the head first (body[0]):
        ctx.beginPath();
        var head_color = "rgb(255, 180, 10)";
        ctx.fillStyle = head_color;
        switch(this.dir){
            case "right":
                ctx.arc(this.body[0].x*CELL_WIDTH, this.body[0].y*CELL_HEIGHT+CELL_HEIGHT/2,
                CELL_HEIGHT/2, 0, Math.PI*2);
                break;
            case "down":
                ctx.arc(this.body[0].x*CELL_WIDTH+CELL_WIDTH/2, this.body[0].y*CELL_HEIGHT,
                CELL_WIDTH/2, 0, Math.PI*2);
                break;
            case "left":
                ctx.arc(this.body[0].x*CELL_WIDTH+CELL_WIDTH, this.body[0].y*CELL_HEIGHT+CELL_HEIGHT/2,
                CELL_HEIGHT/2, 0, Math.PI*2);
                break;
            case "up":
                ctx.arc(this.body[0].x*CELL_WIDTH+CELL_WIDTH/2, this.body[0].y*CELL_HEIGHT+CELL_HEIGHT,
                CELL_WIDTH/2, 0, Math.PI*2);
                break;
            default:
                break;
        }
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.fillStyle = "#000";
        ctx.lineWidth = 2;

        ctx.fillRect(this.body[0].x*CELL_WIDTH+2, this.body[0].y*CELL_HEIGHT+2, 2, 4);
        ctx.fill();
        ctx.beginPath();
        ctx.fillRect(this.body[0].x*CELL_WIDTH+6, this.body[0].y*CELL_HEIGHT+2, 2, 4);
        ctx.fill();
        
        //then, we draw the rest of the body:
        for(var i = 1; i < this.body.length; ++i){

            if(i%2 == 0)
                ctx.fillStyle = "rgba(246, 255, 10, 1)";
            else
                ctx.fillStyle =  head_color;
            
            ctx.beginPath();
            ctx.fillRect(this.body[i].x*CELL_WIDTH, this.body[i].y*CELL_HEIGHT,
                         CELL_WIDTH, CELL_HEIGHT);
            
            ctx.fill();
            ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
            ctx.fillRect(this.body[i].x*CELL_WIDTH, this.body[i].y*CELL_HEIGHT,
                         CELL_WIDTH, CELL_HEIGHT);
            ctx.fill();

        }
    }

    this.move = function(){
        var head = this.body[0];
        switch(this.dir){
            case "right":
                this.body.unshift({x: head.x+1, y: head.y});
                this.body.pop();
                break;
            case "left":
                this.body.unshift({x: head.x-1, y: head.y});
                this.body.pop();
                break;
            case "up":
                this.body.unshift({x: head.x, y: head.y-1});
                this.body.pop();
                break;
            case "down":
                this.body.unshift({x: head.x, y: head.y+1});
                this.body.pop();
                break;
            default:
                console.log("unexpected dir." + this.dir);
        }
    }

    this.eat = function(food){
        var tail = this.body[this.body.length-1];
        this.body.push(tail);
        this.size++;        
    };
    
    this.die = function(){
        ctx.save();
        ctx.strokeStyle = "red";
        var x = this.body[1].x * CELL_WIDTH;
        var y = this.body[1].y * CELL_HEIGHT;
        ctx.moveTo(x, this.body[1].y * CELL_HEIGHT);
        ctx.lineTo(x + CELL_WIDTH, y + CELL_HEIGHT);
        ctx.stroke();
        
        ctx.moveTo(x + CELL_WIDTH, y);
        ctx.lineTo(this.body[1].x*CELL_WIDTH, y + CELL_HEIGHT);
        ctx.stroke();
        
        ctx.restore();
    };
}

function Food(_x, _y){
    this.value = 5;
    this.type = "default";
    this.x = _x;
    this.y = _y;
    var img = new Image();
    this.generateNew = function(snake_body){
        var x, y;
        var rand = Math.floor(Math.random()*BONUS_FOOD_CHANCE);
        if(rand == BONUS_FOOD_CHANCE-1){
            this.value = BONUS_FOOD_VALUE;
            this.type = "bonus";
        }
        else
            this.type = "default";
        
        while(1){
            x = (Math.random()*(NB_HORIZONTAL_CELL-1)).toFixed(0);
            y = (Math.random()*(NB_VERTICAL_CELL-1)).toFixed(0);
         
            var foodColision = false;
            for(var i = 0; i < snake_body.length; ++i){
                if(x == snake_body[i].x && y == snake_body[i].y){
                    foodColision = true;
                    break;
                }
            }
            if(foodColision == false){
                this.x = x;
                this.y = y;
                break;
            }
            //We will have an infinite loop if the snake 
            //grows and occupy all cells.
            //Therfore if the snake occupies all cells, we stop the game.
        }
    };

    this.draw = function(){
        switch(this.type){
            case "default":
                img.src = "ressources/green_apple_15px.png";
                ctx.drawImage(img, this.x*CELL_WIDTH, 
                          this.y*CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
                break;
            case "bonus":
                img.src = "ressources/bird_20px.png";
                ctx.drawImage(img, this.x*CELL_WIDTH, 
                          this.y*CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
                break;
        };
        
    };
}


function Animator(){
    this.period = null;  //Time to wait before redrawing the canvas.
    this.timer = null;   //The setTimeout ID.
    this.work = null;    //What the animator have to do.
    var stop = false;    //Should the animator stop working?
    
    this.stop = function(){ //This function stops the animation.
        stop = true;
        clearTimeout(this.timer);
    };

    this.start = function(){       //Start working, and repeat after a period.
        if(stop == false){
            this.work();
            this.timer = setTimeout(this.start.bind(this), this.period);
        }
    };
    
    this.pause = function(){    //Pause the animation, by user action.
        if(stop == false){
            background_sound.pause();
            this.stop();
            var x = can.width/2;
            var y = can.height/2;
            show_message("Paused", {size: "2em",
                                   textBaseline: "ideographic"}, x, y);
            
            show_message("Press P to continue.", {textBaseline: "hanging",
                                                  size: "1em"}, x, y);
        }
        else{
            background_sound.play();
            stop = false;
            this.start();
        }
    };
    
    this.sleep = function(callback_function, time){    //Pause the animation, programaticaly.
        this.stop();// stop function will be called by stop_snake_game()
        //because the anim instance isn't set to null.
        setTimeout(callback_function, time);
    };
}    
    
//The animator's only instence:
var anim = null;

    
//Function to celebrate the achievment of new hi score:
function celebrate_new_hi_score(new_hi_score){
    show_message("New Hi Score\n", {size: "2em", textBaseline: "hanging"},
                 can.width/2, can.height/4);
    show_message(new_hi_score, {size: "2em", textBaseline: "hanging"},
                 can.width/2, can.height/3);
}

//When the snake hits a wall or itself the game is over, as well as
    //when the snake occupies all cells.
function game_over(){
    background_sound.pause();
    background_sound.currentTime = null;
    show_message("GAME OVER", {size: "3em",
                              textBaseline: "hanging"});
    stop_snake_game();
    if(hi_score < score){
        hi_score = score;
        $hi_score.innerHTML = hi_score;
        sessionStorage.setItem("snake_game_hi_score", hi_score.toString());
        celebrate_new_hi_score(hi_score);
    }
}

//When the game is finished:
function game_finished(){
     anim.stop();
    show_message("Congratulations", {size: "3em"});
    show_message("Your got: " + score, {size: "2.5em", textBaseline: "hanging"});    
}
    

//This is part of the animatore's work, it detects colisions
//between the snake and its body, the walls and the food:
function detectColision(){
    var colision = false;
    if(snake.body[0].x > NB_HORIZONTAL_CELL-1){
        colision = true;
    }
    else if(snake.body[0].x < 0){
        colision = true;
    }
    else if(snake.body[0].y >= NB_VERTICAL_CELL){
        colision = true;
    }
    else if(snake.body[0].y < 0){
        colision = true;
    }
    
    //if the snake hits one of its segments, it dies:
    for(var i = 1; i < snake.body.length; ++i){
        if(snake.body[0].x == snake.body[i].x && snake.body[0].y == snake.body[i].y){
            colision = true;
            break;
        }
    }
    if(colision == true){
        snake_accident_sound.currentTime = 0.5;
        snake_accident_sound.play();
        snake.die();
        show_message("Ouch!",{size: "2em"}, can.width/2, can.height/3);
        game_over();
    }
    if(snake.body[0].x == food.x && snake.body[0].y == food.y){
        food_eaten_sound.play();
        snake.eat(food);
        score += food.value;

        $score.innerHTML = score;
        if((FOOD_EATEN + SNAKE_DEFAULT_SIZE) == (NB_VERTICAL_CELL * NB_HORIZONTAL_CELL)-1){
            game_finished();
        }
        else
            food.generateNew(snake.body);
        if(FOOD_EATEN < REQUIRED_FOOD-1)
            FOOD_EATEN++;
        else{
            level_up_sound.play();
            FOOD_EATEN = 0;
            LEVEL++;
            $level.innerHTML = LEVEL;
            if(LEVEL < MAX_LEVEL) //At the last level, snakes speed is limited.
                snake.speed = DEFAULT_PERIOD - (PERIOD_DIFFRENCE*LEVEL);
        }
    }
}


//We want the snake to move according to what directional
//key the user presses.
//When the user keep a key pressed, the snake goes faster,
    //we do that by decreasing the animatior period by half:
var dir_key = "right";

document.onkeydown = function(e){
    if(anim != null){ //anim is null when not in use.
        //if a key is held pressed the snake accelerates.
        switch(e.which){
            case 37:
                if(snake.dir == "left")
                    anim.period = snake.speed-(snake.speed*50)/100;
                if(snake.dir != "right")
                    dir_key = "left";
                break;
            case 38:
                if(snake.dir == "up")
                    anim.period = snake.speed-(snake.speed*50)/100;
                if(snake.dir != "down")
                    dir_key = "up";
                break;
            case 39:
                if(snake.dir == "right")
                    anim.period = snake.speed-(snake.speed*50)/100;
                if(snake.dir != "left")
                    dir_key = "right";
                break;
            case 40:
                if(snake.dir == "down")
                    anim.period = snake.speed-(snake.speed*50)/100;
                if(snake.dir != "up")
                    dir_key = "down";
                break;
            case 80: //p key.
                anim.pause();
                break;
            default:
                console.log("Unused key: " + e.which);
        }
    }
};
    
//Once the key is released, we go back to normal speed:
document.onkeyup = function(){
    if(anim != null)
        anim.period = snake.speed;
};
    
    

//This function is called to begin a new game with the 
//the remaining lives:
function init_snake_game(){
    background_sound.setAttribute("loop", "true");
    background_sound.play();
    ctx.clearRect(0, 0, can.width, can.height);
    food = new Food((Math.random()*(NB_HORIZONTAL_CELL-1)).toFixed(0),
                     (Math.random()*(NB_VERTICAL_CELL-1)).toFixed(0));


    snake = new Snake(6, DEFAULT_PERIOD - (PERIOD_DIFFRENCE*LEVEL));
    dir_key = "right"; //init
    
    if(anim != null){
        stop_snake_game();
    }
    anim = new Animator();
    anim.period = snake.speed;


    anim.work = function(){
        //The move function should be called after s.draw() 
        // or the snake wont start at the cell 0.
        ctx.clearRect(0, 0, can.width, can.height);
                      
        snake.dir = dir_key;
        snake.move();
        snake.draw();

        food.draw();    
        detectColision();
        //drawVisualHelpers();
    };
}
    

//We bind some buttons to actions the user want to do: reset, stop,...
document.getElementById("snake_game_reset").onclick = function(){
    FOOD_EATEN = 0;
    LEVEL = 1;
    $level.innerHTML = LEVEL;
    score = 0;
    $score.innerHTML = score;
    reset_snake_game();
};

    
    
function reset_snake_game(){
    init_snake_game();
    start_snake_game();
}

function start_snake_game(){
    anim.start();
}

function stop_snake_game(){
    anim.stop();
    anim = null;
}
    
function introduction_animation(){
    var animator = new Animator();
    animator.period = 5;
        var x = can.width/2;
        var y = 0;
    animator.work = function(){
        ctx.clearRect(0, 0, can.width, can.height);

        show_message("Snake Game", {size: "2em"}, x, y+=1);

        if(y > can.height/2){
            level_up_sound.play();
            animator.stop();
            show_message("By Youssouf, nzomedia2@gmail.com", {size: "0.8em", textAlign: "right", fillStyle: "#a7ff00", strokeStyle: "transparent"}, can.width-8, can.height-8);

            setTimeout(function(){init_snake_game(); start_snake_game();}, 1000);
        }
    };
    animator.start();

            
}
    
//When the page loads the game starts.
//It would be better to put an action button
//to start the game:
//init_snake_game();
//start_snake_game();
introduction_animation();
