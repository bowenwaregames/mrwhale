import { Collection } from 'discord.js';
import { Command, Message } from 'yamdbf';
import { BotClient } from '../../client/botClient';
import { lose, win } from '../../data/minesweeperCommentary';
import { MinesweeperGame } from '../../types/games/minesweeperGame';
import { MinesweeperOptions } from '../../types/games/minesweeperOptions';

export default class extends Command<BotClient> {
    private _games: Collection<string, MinesweeperGame>;

    constructor() {
        super({
            name: 'minesweeper',
            desc: 'Play the class game of hangman.',
            usage: '<prefix>minesweeper <start <easy|medium|hard>|end>',
            aliases: ['flag', 'unflag', 'reveal'],
            group: 'games',
            ratelimit: '10/30s',
            guildOnly: true
        });
        this._games = new Collection<string, MinesweeperGame>();
    }

    private convertLetterToNumber(str: string): number {
        str = str.toUpperCase();
        let out = 0;
        const len = str.length;
        for (let pos = 0; pos < len; pos++) {
            out += (str.charCodeAt(pos) - 65) * Math.pow(26, len - pos - 1);
        }
        return out;
    }

    private async startGame(message: Message, args: any[]): Promise<any> {
        const channelId: string = message.channel.id;
        const authorId: string = message.author.id;

        if (this._games.has(channelId)) {
            return message.channel.sendMessage(
                'A game of minesweeper is already running on this channel!'
            );
        } else {
            if (args.length < 2) {
                const gameOption: MinesweeperOptions = {
                    gridXSize: 15,
                    gridYSize: 15,
                    bombCount: 20,
                    gameDuration: 400
                };
                const game: MinesweeperGame = new MinesweeperGame(gameOption, authorId);
                this._games.set(channelId, game);
                game.start();
            } else if (args[1].toString().toLowerCase() === 'easy') {
                const gameOption: MinesweeperOptions = {
                    gridXSize: 10,
                    gridYSize: 10,
                    bombCount: 15,
                    gameDuration: 360
                };
                const game: MinesweeperGame = new MinesweeperGame(gameOption, authorId);
                this._games.set(channelId, game);
                game.start();
            } else if (args[1].toString().toLowerCase() === 'medium') {
                const gameOption: MinesweeperOptions = {
                    gridXSize: 15,
                    gridYSize: 15,
                    bombCount: 26,
                    gameDuration: 600
                };
                const game: MinesweeperGame = new MinesweeperGame(gameOption, authorId);
                this._games.set(channelId, game);
                game.start();
            } else if (args[1].toString().toLowerCase() === 'hard') {
                const gameOption: MinesweeperOptions = {
                    gridXSize: 20,
                    gridYSize: 20,
                    bombCount: 35,
                    gameDuration: 900
                };
                const game: MinesweeperGame = new MinesweeperGame(gameOption, authorId);
                this._games.set(channelId, game);
                game.start();
            } else {
                return message.channel.sendMessage(
                    'Please pass in a valid difficulty modifier or none at all!' +
                        '\nvalid difficulties: easy | normal | hard'
                );
            }

            return message.channel.sendMessage(
                this.constructGameScreen(this._games.get(channelId))
            );
        }
    }

    private async endGame(message: Message): Promise<Message | Message[]> {
        const channelId: string = message.channel.id;
        const authorId: string = message.author.id;
        if (this._games.has(channelId)) {
            const game: MinesweeperGame = this._games.get(channelId);
            if (game.owner !== authorId) {
                return message.channel.sendMessage(
                    'You have to be the game starter to end the game!'
                );
            } else {
                game.forceLose();
                game.revealAllTiles();
                message.channel.sendMessage('```' + game.playingFieldString + '```');
                message.channel.sendMessage(
                    'You revealed ' +
                        game.revealedTileCount.toString() +
                        ' out of ' +
                        game.totalTileCount.toString() +
                        ' tile.'
                );
                const lossModifier = lose[Math.round(Math.random() * (lose.length - 1))];
                return message.channel.sendMessage('Game finished... You lost. ' + lossModifier);
            }
        } else {
            return message.channel.sendMessage("You can't end the game when no game is running.");
        }
    }

    private constructGameScreen(game: MinesweeperGame): string {
        let str = '```' + game.playingFieldString;

        str +=
            '\nTile left: ' +
            (game.totalTileCount - game.totalMineCount - game.revealedTileCount).toString();
        str +=
            '\nTotal tile count: ' +
            game.totalTileCount.toString() +
            ' | Mine left: ' +
            game.totalMineCount.toString();
        str += '\nYou have ' + game.timeLeftString + ' seconds left!```';

        return str;
    }

    async reveal(message: Message, args: any[]): Promise<any> {
        const channelId: string = message.channel.id;
        if (!this._games.has(channelId)) {
            return message.channel.sendMessage(
                'No game of minesweeper is running on this channel!'
            );
        }

        const game: MinesweeperGame = this._games.get(channelId);

        const prefix: string = await this.client.getPrefix(message.guild);

        let xTilePos = 0;
        try {
            xTilePos = parseInt(args[0].toString(), 10);
        } catch {
            return message.channel
                .send(`Please provide a valid coordinate. (${prefix}flag <number> <letter>) \n' +
                                        'ex: ${prefix}reveal 5 b`);
        }

        let yTilePos = 0;
        try {
            yTilePos = this.convertLetterToNumber(args[1].toString());
        } catch {
            return message.channel
                .send(`Please provide a valid coordinate. (${prefix}flag <number> <letter>) \n' +
                                        'ex: ${prefix}reveal 5 b`);
        }

        if (
            xTilePos >= game.xTileSize ||
            yTilePos >= game.yTileSize ||
            xTilePos < 0 ||
            yTilePos < 0
        ) {
            return message.channel.send(
                'Please provide a valid coordinate.' +
                    'The coordinate you passed in is not in the board!'
            );
        }

        if (game.isFlagged(xTilePos, yTilePos)) {
            return message.channel.send(`That tile is flagged! No revealing a flagged tile!`);
        }

        game.revealTile(xTilePos, yTilePos);

        if (game.gameOver) {
            if (game.won) {
                game.revealAllTiles();
                message.channel.sendMessage('```' + game.playingFieldString + '```');
                const winModifier = win[Math.round(Math.random() * (win.length - 1))];
                return message.channel.sendMessage('Game finished... You won! ' + winModifier);
            } else if (game.lost) {
                game.revealAllTiles();
                message.channel.sendMessage('```' + game.playingFieldString + '```');
                message.channel.sendMessage(
                    'You revealed ' +
                        game.revealedTileCount.toString() +
                        ' out of ' +
                        game.totalTileCount.toString() +
                        ' tile.'
                );
                const lossModifier = lose[Math.round(Math.random() * (lose.length - 1))];
                return message.channel.sendMessage('Game finished... You lost. ' + lossModifier);
            }
        }

        return message.channel.send(this.constructGameScreen(game));
    }

    async flag(message: Message, args: any[]): Promise<any> {
        const channelId: string = message.channel.id;
        if (!this._games.has(channelId)) {
            return message.channel.sendMessage(
                'No game of minesweeper is running on this channel!'
            );
        }

        const game: MinesweeperGame = this._games.get(channelId);

        const prefix: string = await this.client.getPrefix(message.guild);

        let xTilePos = 0;
        try {
            xTilePos = parseInt(args[0].toString(), 10);
        } catch {
            return message.channel
                .send(`Please provide a valid coordinate. (${prefix}flag <number> <letter>) \n'+
                                        'ex: ${prefix}flag 5 b`);
        }

        let yTilePos = 0;
        try {
            yTilePos = this.convertLetterToNumber(args[1].toString());
        } catch {
            return message.channel
                .send(`Please provide a valid coordinate. (${prefix}flag <number> <letter>) \n'+
                                        'ex: ${prefix}flag 5 b`);
        }

        if (
            xTilePos >= game.xTileSize ||
            yTilePos >= game.yTileSize ||
            xTilePos < 0 ||
            yTilePos < 0
        ) {
            return message.channel.send(
                'Please provide a valid coordinate.' +
                    'The coordinate you passed in is not in the board!'
            );
        }

        if (game.isFlagged(xTilePos, yTilePos)) {
            return message.channel.send(`That tile is already flagged!`);
        }

        game.flagTile(xTilePos, yTilePos);

        return message.channel.send(this.constructGameScreen(game));
    }

    async unflag(message: Message, args: any[]): Promise<any> {
        const channelId: string = message.channel.id;
        if (!this._games.has(channelId)) {
            return message.channel.sendMessage(
                'No game of minesweeper is running on this channel!'
            );
        }

        const game: MinesweeperGame = this._games.get(channelId);

        const prefix: string = await this.client.getPrefix(message.guild);

        let xTilePos = 0;
        try {
            xTilePos = parseInt(args[0].toString(), 10);
        } catch {
            return message.channel
                .send(`Please provide a valid coordinate. (${prefix}flag <number> <letter>) \n'+
                                        'ex: ${prefix}unflag 5 b`);
        }

        let yTilePos = 0;
        try {
            yTilePos = this.convertLetterToNumber(args[1].toString());
        } catch {
            return message.channel
                .send(`Please provide a valid coordinate. (${prefix}flag <number> <letter>) \n'+
                                        'ex: ${prefix}unflag 5 b`);
        }

        if (
            xTilePos >= game.xTileSize ||
            yTilePos >= game.yTileSize ||
            xTilePos < 0 ||
            yTilePos < 0
        ) {
            return message.channel.send(
                'Please provide a valid coordinate.' +
                    'The coordinate you passed in is not in the board!'
            );
        }

        if (!game.isFlagged(xTilePos, yTilePos)) {
            return message.channel.send(`That tile is already unflagged!`);
        }

        game.unFlagTile(xTilePos, yTilePos);

        return message.channel.send(this.constructGameScreen(game));
    }

    async action(message: Message, args: any[]): Promise<any> {
        // return message.channel.sendMessage(this.numToString(parseInt(args.toString(), 10)).toString());
        // const mineTest = new MinesweeperGame();
        // mineTest.start();
        // return message.channel.sendMessage(mineTest.playingFieldString);
        const channelId: string = message.channel.id;
        const authorId: string = message.author.id;

        if (this._games.has(channelId)) {
            const game = this._games.get(channelId);
            if (game.timedOut) {
                if (args[0] && args[0].toLowerCase !== 'start') {
                    message.channel.send("Time's up!");
                    this.endGame(message);
                } else {
                    message.channel.send('Last game is timed out! Starting new game...');
                    game.forceLose();
                }
            }
            if (game.gameOver) this._games.delete(channelId);
        }

        const prefix: string = await this.client.getPrefix(message.guild);

        if (message.content.startsWith(`${prefix}reveal`)) {
            if (args.length < 2) {
                return message.channel
                    .send(`Please provide a valid coordinate. (${prefix}reveal <number> <letter>) \n
                                            ex: ${prefix}reveal 15 c`);
            }
            return this.reveal(message, args);
        }

        if (message.content.startsWith(`${prefix}flag`)) {
            if (args.length < 2) {
                return message.channel
                    .send(`Please provide a valid coordinate. (${prefix}flag <number> <letter>) \n
                                            ex: ${prefix}reveal 1 aa`);
            }
            return this.flag(message, args);
        }

        if (message.content.startsWith(`${prefix}unflag`)) {
            if (args.length < 2) {
                return message.channel
                    .send(`Please provide a valid coordinate. (${prefix}unflag <number> <letter>) \n
                                            ex: ${prefix}reveal 14 ac`);
            }
            return this.unflag(message, args);
        }

        if (!args[0]) return message.channel.send('Please provide a command.');

        if (args && args[0] === 'start') this.startGame(message, args);
        else if (args && args[0] === 'end') this.endGame(message);
    }
}