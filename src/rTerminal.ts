'use strict';

import os = require('os');
import path = require('path');

import { pathExists } from 'fs-extra';
import { isDeepStrictEqual } from 'util';
import { commands, Terminal, TerminalOptions, window } from 'vscode';

import { getSelection } from './selection';
import { removeSessionFiles } from './session';
import { config, delay, getRpath } from './util';
export let rTerm: Terminal;

export async function createRTerm(preserveshow?: boolean): Promise<boolean> {
    const termName = 'R Interactive';
    const termPath = await getRpath();
    console.info(`termPath: ${termPath}`);
    if (termPath === undefined) {
        return undefined;
    }
    const termOpt: string[] = config().get('rterm.option');
    pathExists(termPath, (err, exists) => {
        if (exists) {
            const termOptions: TerminalOptions = {
                name: termName,
            };
            if (config().get<boolean>('sessionWatcher')) {
                termOptions.env = {
                    R_PROFILE_USER_OLD: process.env.R_PROFILE_USER,
                    R_PROFILE_USER: path.join(os.homedir(), '.vscode-R', '.Rprofile'),
                };
            }
            // Start a shell and execute R terminal from shell to
            // inherit environment variables from shell
            rTerm = window.createTerminal(termOptions);
            rTerm.show(preserveshow);
            rTerm.sendText(`${termPath} ${termOpt.join(' ')}`);

            return true;
        }
        window.showErrorMessage('Cannot find R client.  Please check R path in preferences and reload.');

        return false;
    });
}

export async function restartRTerminal(){
    if (typeof rTerm !== 'undefined'){
        rTerm.dispose();
        deleteTerminal(rTerm);
        await createRTerm(true);
    }
}

export function deleteTerminal(term: Terminal) {
    if (isDeepStrictEqual(term, rTerm)) {
        rTerm = undefined;
        if (config().get<boolean>('sessionWatcher')) {
            removeSessionFiles();
        }
    }
}

export async function chooseTerminal() {
    if (config().get('alwaysUseActiveTerminal')) {
        if (window.terminals.length < 1) {
            window.showInformationMessage('There are no open terminals.');

            return undefined;
        }

        return window.activeTerminal;
    }

    if (window.terminals.length > 0) {
        const rTermNameOptions = ['R', 'R Interactive'];
        if (window.activeTerminal !== undefined) {
            const activeTerminalName = window.activeTerminal.name;
            if (rTermNameOptions.includes(activeTerminalName)) {
                return window.activeTerminal;
            }
            for (let i = window.terminals.length - 1; i >= 0; i--){
                const terminal = window.terminals[i];
                const terminalName = terminal.name;
                if (rTermNameOptions.includes(terminalName)) {
                    terminal.show(true);
                    return terminal;
                }
            }
        } else {
            // Creating a terminal when there aren't any already does not seem to set activeTerminal
            if (window.terminals.length === 1) {
                const activeTerminalName = window.terminals[0].name;
                if (rTermNameOptions.includes(activeTerminalName)) {
                    return window.terminals[0];
                }
            } else {
                // tslint:disable-next-line: max-line-length
                window.showInformationMessage('Error identifying terminal! This shouldn\'t happen, so please file an issue at https://github.com/Ikuyadeu/vscode-R/issues');

                return undefined;
            }
        }
    }

    if (rTerm === undefined) {
        const success = createRTerm(true);
        await delay(200); // Let RTerm warm up
        if (!success) {
            return undefined;
        }
    }

    return rTerm;
}

export function runSelectionInTerm(moveCursor: boolean) {
    const selection = getSelection();
    if (moveCursor && selection.linesDownToMoveCursor > 0) {
        commands.executeCommand('cursorMove', { to: 'down', value: selection.linesDownToMoveCursor });
        commands.executeCommand('cursorMove', { to: 'wrappedLineFirstNonWhitespaceCharacter' });
    }
    runTextInTerm(selection.selectedText);
}

export async function runTextInTerm(text: string) {
    const term = await chooseTerminal();
    if (term === undefined) {
        return;
    }
    if (config().get<boolean>('bracketedPaste')) {
        if (process.platform !== 'win32') {
            // Surround with ANSI control characters for bracketed paste mode
            text = `\x1b[200~${text}\x1b[201~`;
        }
        term.sendText(text);
    } else {
        const rtermSendDelay: number = config().get('rtermSendDelay');
        for (const line of text.split('\n')) {
            await delay(rtermSendDelay); // Increase delay if RTerm can't handle speed.
            term.sendText(line);
        }
    }
    setFocus(term);
}

function setFocus(term: Terminal) {
    const focus: string = config().get('source.focus');
    term.show(focus !== 'terminal');
}
