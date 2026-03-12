import { JSDOM } from "jsdom"
import fs from "fs"

function fix(str) {
    return str.replace(/\t/g, "");
}

function getText(list) {
    const arr = []
    for (const node of list) {
        arr.push(fix(node.textContent))
    }
    return arr;
}

function getSrc(list) {
    const arr = []
    for (const node of list) {
        arr.push(node.src)
    }
    return arr;
}

function getHref(list) {
    const arr = []
    for (const node of list) {
        arr.push(node.href)
    }
    return arr;
}

function fetchCopypasta(path) {
    return fetch("https://copypastatext.com/" + path, {
        method: "GET"
    })
        .then((res) => { console.log("Feito"); return res })
        .then((res) => res.text())
        .then(function (html) {

            fs.writeFileSync("index.html", html)
            console.log("Ok")
            return new JSDOM(html, {
                contentType: 'text/html; charset=UTF-8'
            }).window.document;
        })
}

function getPagesLength(doc) {
    let pageNumbers = getText(doc.querySelectorAll(".page-numbers"))
    let penultPageNumber = pageNumbers[pageNumbers.length - 2];
    let lastPageNumber = pageNumbers[pageNumbers.length - 1];
    let pageLength = Number(penultPageNumber.replace(",", ""));

    if (!lastPageNumber.match(/next/gi)) {
        pageLength = Number(lastPageNumber.replace(",", ""));
    }

    return pageLength
}

/**
 * @typedef Copypasta
 * @type {object}
 * @property {string} title
 * @property {[string]} subTitles
 * @property {[string]} copypastas
 * @property {[string]} images
 * @property {[string]} descriptions
 * @property {[string]} iframes
 */

/**
 * @typedef StandardGetCopypastasResponse
 * @type {object}
 * @property {number} page
 * @property {number} pageLength
 * @property {string} type
 * @property {[Copypasta]} copypastas
 */

/**
 * @param {string} path 
 * @param {string} error 
 * @param {"copypastas" | "asciis" | "search"} type
 * @param {number} page 
 * @returns {Promise<StandardGetCopypastasResponse>}
 */
function standardGetCopypastas(path, error, type, page = 1) {
    return fetchCopypasta(path)
        .then(function (doc) {
            if (doc.querySelector(".col-12.nv-content-none-wrap p") && doc.querySelector(".col-12.nv-content-none-wrap p").textContent == error) {
                return {
                    error: error
                }
            }

            const articles = doc.querySelectorAll(".article-content-col");
            const copypastas = [];

            for (const node of articles) {
                let codeEl = []
                for (const el of node.querySelectorAll("*")) {
                    if (el.tagName.toLowerCase().startsWith('code')) {
                        codeEl.push(el)
                    }
                }

                const copypasta = {
                    title: fix(node.querySelector(".blog-entry-title.entry-title").textContent),
                    subTitles: getText(node.querySelectorAll(".wp-block-heading")),
                    copypastas: getText(codeEl).concat(getText(node.querySelectorAll("steamascii"))),
                    images: getSrc(node.querySelectorAll(".wp-block-image img")),
                    descriptions: getText(node.querySelectorAll("p")),
                    iframes: getHref(node.querySelectorAll("blockquote a"))
                }

                copypastas.push(copypasta)
            }

            return {
                page: page,
                type: type,
                pagesLength: getPagesLength(doc),
                copypastas: copypastas
            }
        })
}

/**
 * @param {number} page 
 */
export function getCopypastas(page = 1) {
    return standardGetCopypastas(`page/${page}/`, "It seems we can’t find what you’re looking for. Perhaps searching can help.", "copypastas", page);
}

export function searchCopypasta(query, page = 1) {
    return standardGetCopypastas(`page/${page}/?s=${encodeURI(query)}`, "Sorry, but nothing matched your search terms. Please try again with some different keywords.", "search", page)
}
/**
 * @param {"ascii-art" | "brainrot" |"anime" |"emojipasta" | "cursedthoughts"| "replies"| "storytime" | "valorant" | "csgo" |"dota-2"| "lol" | "runescape"} category 
 * @param {number} page 
 */
export function getCategoryCopypasta(category, page = 1) {
    const categorys = {
        "ascii-art": "ascii-art",
        "brainrot": "brainrot",
        "anime": "anime",
        "emojipasta": "emojipasta",
        "cursedthoughts": "cursedthoughts",
        "replies": "replies",
        "storytime": "storytime",
        "valorant": "valorant",
        "csgo": "csgo",
        "dota-2": "dota-2",
        "lol": "lol",
        "runescape": "runescape"
    }

    return standardGetCopypastas(`category/${categorys[category]}/page/${page}/`, "It seems we can’t find what you’re looking for. Perhaps searching can help.", "copypastas", page)
}

/**
 * @param {"pokemon-copypasta" | "packgod" | "breaking-bad"  | "discord-copypasta"| "lowtiergod" | "osugame" | "arknights" | "genshin-impact"} tag 
 * @param {number} page 
 */    
export function getTagCopypasta(tag, page = 1) {
    const tags = {
        "pokemon-copypasta": "pokemon-copypasta",
        "packgod": "packgod",
        "breaking-bad": "breaking-bad",
        "discord-copypasta": "discord-copypasta",
        "lowtiergod": "lowtiergod",
        "osugame": "osugame",
        "arknights": "arknights",
        "genshin-impact": "genshin-impact"
    }

    return standardGetCopypastas(`tag/${tags[tag]}/page/${page}/`, "It seems we can’t find what you’re looking for. Perhaps searching can help.", "copypastas", page)
}

async function dowloadAll(func, firstArg, name) {
    const items = [];
    let page = 1;
    let pagesLength;
    let arg = firstArg;
    do {
        const body = await func(...arg);
        items.push(body)
        page++
        arg[arg.length - 1] = page 
        pagesLength = body.pagesLength
    } while (page <= pagesLength);

    fs.writeFileSync(name + ".json", JSON.stringify(items))
}
/** 
 * @param {"ascii-art" | "brainrot" |"anime" |"emojipasta" | "cursedthoughts"| "replies"| "storytime" | "valorant" | "csgo" |"dota-2"| "lol" | "runescape"} category
 */
function dowloadAllCategory(category) {
    dowloadAll(getCategoryCopypasta, [category, 1], category + "-" + "copypastas")
}

/**
 * @param {"pokemon-copypasta" | "packgod" | "breaking-bad"  | "discord-copypasta"| "lowtiergod" | "osugame" | "arknights" | "genshin-impact"} tag 
 */ 
function dowloadAllTag(tag){
    dowloadAll(getTagCopypasta, [tag, 1], tag + "-" + "copypastas")
}

function dowloadAllCopypastas(){
    dowloadAll(getCopypastas, [1], "all-copypastas")
}

//const body = await dowloadAllCopypastas()
//console.log(body)