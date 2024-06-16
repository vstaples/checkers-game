// player.js

class Player {
    constructor(username = "", wins = 0, losses = 0, captured = 0) {
        this.username = username;
        this.wins = wins;
        this.losses = losses;
        this.captured = captured;
    }

    addCaptured() {
        this.captured += 1;
    }

    addWin() {
        this.wins += 1;
    }

    addLoss() {
        this.losses += 1;
    }

    getInfo() {
        return {
            username: this.username,
            wins: this.wins,
            losses: this.losses,
            captured: this.captured
        };
    }
}

module.exports = Player;