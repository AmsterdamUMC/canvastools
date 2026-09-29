// ==UserScript==
// @name         Canvas - Audit Assignment Due Dates
// @namespace    canvas-due-date-audit
// @version      1.4
// @description  Find assignments, quizzes and files with due dates or availability dates before a chosen cutoff date, and optionally move the flagged dates when the course starting date shifts.
// @match        https://canvas.uva.nl/courses/*
// @grant        none
// ==/UserScript==

/*
 * This userscript is assembled from the modules in src/ by
 * build.ps1. Do not edit the compiled output in dist/. Edit the
 * modules and re-run .\build.ps1.
 */

(function () {
    'use strict';
