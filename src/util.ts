'use strict';

import { existsSync } from 'fs-extra';
import path = require('path');
import fs = require('fs');
import { window, workspace } from 'vscode';
import winreg = require('winreg');

export function config() {
    return workspace.getConfiguration('r');
}

async function getRfromRegistry() {
    try {
        const key = new winreg({
            hive: winreg.HKLM,
            key: '\\Software\\R-Core\\R',
        });
        const item: winreg.RegistryItem = await new Promise((c, e) =>
            key.get('InstallPath', (err, result) => err === null ? c(result) : e(err)));
        return path.join(item.value, 'bin', 'R.exe');
    } catch (e) {
        return '';
    }
}

function getRfromEnvPath(platform: string) {
    let splitChar: string = ':';
    let fileExtension: string = '';
    
    if (platform === 'win32') {
        splitChar = ';';
        fileExtension = '.exe';
    }
    
    const os_paths: string[]|string = process.env.PATH.split(splitChar);
    for (const os_path of os_paths) {
        const os_r_path: string = path.join(os_path, 'R' + fileExtension);
        if (fs.existsSync(os_r_path)) {
            return os_r_path;
        }
    }
    return '';
}

export async function getRpath() {
    let path: string = config().get('lsp.path');
    const platform: string = process.platform;
    
    if (path && existsSync(path)) {
        return path;
    }

    if (process.platform === 'win32') {
        path = await getRfromRegistry();
        if (path && existsSync(path)) {
            return path;
        }
    }

    if (path === '') {
        path = getRfromEnvPath(platform);
    }
    if (path !== '') {
        return path;
    }

    return 'R';
}

export async function getRterm() {
    let path: string = '';
    const platform: string = process.platform;
    
    if ( platform === 'win32') {
        path = config().get<string>('rterm.windows');
        if (path === '') {
            path = await getRfromRegistry();
        }
    } else if (platform === 'darwin') {
        path = config().get<string>('rterm.mac');
    } else if (platform === 'linux') {
        path = config().get<string>('rterm.linux');
    }
    
    if (path === '') {
        path = getRfromEnvPath(platform);
    }
    if (path !== '') {
        return path;
    }
    window.showErrorMessage(`${process.platform} can't find R`);
    return undefined;
}

export function ToRStringLiteral(s: string, quote: string) {
    if (s === undefined) {
        return 'NULL';
    }

    return (quote +
        s.replace(/\\/g, '\\\\')
            .replace(/"""/g, `\\${quote}`)
            .replace(/\\n/g, '\\n')
            .replace(/\\r/g, '\\r')
            .replace(/\\t/g, '\\t')
            .replace(/\\b/g, '\\b')
            .replace(/\\a/g, '\\a')
            .replace(/\\f/g, '\\f')
            .replace(/\\v/g, '\\v') +
        quote);
}

export async function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function checkForSpecialCharacters(text: string) {
    return !/[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?\s]/g.test(text);
}

export function checkIfFileExists(filePath: string) {
    return existsSync(filePath);
}
