/*
 * fitlayout-puppeteer -- Puppeteer-based web page renderer for FitLayout
 * (c) Radek Burget 2020-2021
 *
 * Transforms a rendered web page to its JSON description that can be later
 * parsed by fitlayout-render-puppeteer.
 */

const argv = require('yargs/yargs')(process.argv.slice(2))
    .usage('Usage: $0 [options] <url>')
	//.example('$0 -W 1200 -H 800 http://cssbox.sf.net', '')
	.strictOptions(true)
    .alias('W', 'width')
    .nargs('W', 1)
	.default('W', 1200)
	.describe('W', 'Target page width')
    .alias('H', 'height')
    .nargs('H', 1)
	.default('H', 800)
	.describe('H', 'Target page height')
	.alias('P', 'persistence')
	.nargs('P', 1)
	.default('P', 1)
	.describe('P', 'Content downloading persistence: 0 (quick), 1 (standard), 2 (wait longer), 3 (get as much as possible)')
	.alias('s', 'screenshot')
	.boolean('s')
	.default('s', false)
	.describe('s', 'Include a screenshot in the result')
	.alias('I', 'download-images')
	.boolean('I')
	.default('I', false)
	.describe('I', 'Download all contained images referenced in <img> elements')
    .help('h')
    .alias('h', 'help')
    .argv;

if (argv._.length !== 1) {
	process.stderr.write('<url> is required. Use -h for help.\n');
	process.exit(1);
}

const targetUrl = argv._[0];
const wwidth = argv.width;
const wheight = argv.height;

let downloadOptions = {};
switch (argv.P) {
	case 0:
		downloadOptions = {waitUntil: 'domcontentloaded', timeout: 10000};
		break;
	case 1:
		downloadOptions = {waitUntil: 'load', timeout: 15000};
		break;
	case 2:
		downloadOptions = {waitUntil: 'networkidle2', timeout: 15000};
		break;
	default:
		downloadOptions = {waitUntil: 'networkidle0', timeout: 50000};
		break;
}

const puppeteer = require('puppeteer');

(async () => {
	const browser = await puppeteer.launch({
		headless: true,
		//slowMo: 250,
		args: [`--window-size=${wwidth},${wheight}`],
		defaultViewport: null
	});
	const page = await browser.newPage();
	try {
		await page.goto(targetUrl, downloadOptions);
	} catch (e) {
		console.error(e);
	}
	//page.on('console', msg => console.log('PAGE LOG:', msg.text() + '\n'));

	//always take a screenshot in order to get the whole page into the viewport
	let screenShot = await page.screenshot({
		type: "png",
		fullPage: true,
		encoding: "base64"
	});

	//produce the box tree
	let pg = await page.evaluate(() => {

		/*=client.js=*/
﻿﻿/**
*
*  JFont Checker
*  Derek Leung
*  Original Date: 2010.8.23
*  Current: Feb 2016
*  
*  This piece of code checks for the existence of a specified font.
*  It ultilizes the font fallback mechanism in CSS for font checking.
*  
*  Compatibility:
*  Tested on Chrome, Firefox, IE9+
*  Requires CSS and JS
*  
**/
(function(){
	var containerA, containerB, html = document.getElementsByTagName("html")[0],
		filler = "random_words_#_!@#$^&*()_+mdvejreu_RANDOM_WORDS";

	function createContainers(){
		containerA = document.createElement("span");
		containerB = document.createElement("span");

		containerA.textContent = filler;
		containerB.textContent = filler;

		var styles = {
			margin: "0",
			padding: "0",
			fontSize: "32px",
			position: "absolute",
			zIndex: "-1"
		};

		for(var key in styles){
			if(styles.hasOwnProperty(key)){
				containerA.style[key] = styles[key];
				containerB.style[key] = styles[key];
			}
		}

		return function(){
			//clean up
			containerA.outerHTML = "";
			containerB.outerHTML = "";
		};
	}

	function checkDimension(){
		return containerA.offsetWidth === containerB.offsetWidth &&
			   containerA.offsetHeight === containerB.offsetHeight;
	}

	function checkfont(font, DOM){
		var rootEle = html;
		if(DOM && DOM.children && DOM.children.length) rootEle = DOM.children[0];

		var result = null,
			reg = /[\,\.\/\;\'\[\]\`\<\>\\\?\:\"\{\}\|\~\!\@\#\$\%\^\&\*\(\)\-\=\_\+]/g,
			cleanUp = createContainers();

		font = font.replace(reg, "");

		rootEle.appendChild(containerA);
		rootEle.appendChild(containerB);

		//First Check
		containerA.style.fontFamily = font + ",monospace";
		containerB.style.fontFamily = "monospace";

		if(checkDimension()){
		   	//Assume Arial exists, Second Check
			containerA.style.fontFamily = font + ",Arial";
			containerB.style.fontFamily = "Arial";
			result = !checkDimension();
		}else{
			result = true;
		}

		cleanUp();
		return result
	}

	this.checkfont = checkfont;
})();function fitlayoutExportBoxes() {

	const styleProps = [
		"display",
		"position",
		"color",
		"background-color",
		"font",
		"border-top",
		"border-right",
		"border-bottom",
		"border-left",
		"overflow",
		"transform",
		"visibility",
		"opacity"
	];

	const replacedElements = [
		"img",
		"svg",
		"object",
		"iframe"
	];

	const replacedImages = [
		"img",
		"svg"
	];

	let nextId = 0;

	function createBoxes(e, style, boxOffset) {
		e.fitlayoutID = []; //box IDs for the individual boxes
		let rects = Array.from(e.getClientRects());
		// find the lines
		let lineStart = 0;
		let lastY = 0;
		let ret = [];
		let i = 0;
		for (i = 0; i < rects.length; i++) {
			const rect = rects[i];
			// detect line breaks
			if (i > lineStart && rect.y != lastY) {
				// finish the line and create the box
				let box = createBox(e, style, rects.slice(lineStart, i), lineStart + boxOffset);
				box.istart = lineStart;
				box.iend = i;
				ret.push(box);
				for (let j = lineStart; j < i; j++) {
					e.fitlayoutID.push(box.id);
				}
				// start next line
				lineStart = i;
			}
			lastY = rect.y;
		}
		//finish the last line
		if (i > lineStart) {
			let box = createBox(e, style, rects.slice(lineStart, i), lineStart + boxOffset);
			box.istart = lineStart;
			box.iend = i;
			ret.push(box);
			for (let j = lineStart; j < i; j++) {
				e.fitlayoutID.push(box.id);
			}
		}

		return ret;
	}

	/**
	 * 
	 * @param {*} e 
	 * @param {*} style 
	 * @param {*} rects 
	 * @param {*} boxIndex the index of the first rectangle within the parent node
	 */
	function createBox(e, style, rects, boxIndex) {
		let ret = {};
		ret.id = nextId++;
		ret.tagName = e.tagName;
		let srect = getSuperRect(rects);
		ret.x = srect.x;
		ret.y = srect.y;
		ret.width = srect.width;
		ret.height = srect.height;

		if (isReplacedElement(e)) {
			ret.replaced = true;
		}

		//gather text decoration info for further propagation
		let decoration = {};
		decoration.underline = (style['text-decoration-line'].indexOf('underline') !== -1);
		decoration.lineThrough = (style['text-decoration-line'].indexOf('line-through') !== -1);
		e.fitlayoutDecoration = decoration;

		//mark the boxes that have some background images
		ret.hasBgImage = (style['background-image'] !== 'none');

		if (e.offsetParent === undefined) { //special elements such as <svg>
			ret.parent = getParentId(e.parentElement, boxIndex); //use parent instead of offsetParent
		} else if (e.offsetParent !== null) {
			ret.parent = getParentId(e.offsetParent, boxIndex);
		}
		if (e.parentElement !== null) {
			ret.domParent = getParentId(e.parentElement, boxIndex);
			if (e.parentElement.fitlayoutDecoration !== undefined) {
				//use the propagated text decoration if any
				decoration.underline |= e.parentElement.fitlayoutDecoration.underline;
				decoration.lineThrough |= e.parentElement.fitlayoutDecoration.lineThrough;
			}
		}

		//encode the text decoration
		if (decoration.underline || decoration.lineThrough) {
			ret.decoration = '';
			if (decoration.underline) {
				ret.decoration += 'U';
			}
			if (decoration.lineThrough) {
				ret.decoration += 'T';
			}
		}

		//encode the remaining style properties
		let css = "";
		styleProps.forEach((name) => {
			css += name + ":" + style[name] + ";";
		});
		ret.css = css;

		//add attributes
		if (e.hasAttributes()) {
			let attrs = e.attributes;
			ret.attrs = [];
			for (let i = 0; i < attrs.length; i++) {
				ret.attrs.push({
					name: attrs[i].name,
					value: attrs[i].value
				});
			}
		}

		return ret;
	}

	function getSuperRect(rects) {
		let x1 = 0;
		let y1 = 0;
		let x2 = 0;
		let y2 = 0;
		let first = true;
		for (rect of rects) {
			if (first || rect.x < x1) {
				x1 = rect.x;
			}
			if (first || rect.y < y1) {
				y1 = rect.y;
			}
			if (first || rect.x + rect.width > x2) {
				x2 = rect.x + rect.width;
			}
			if (first || rect.y + rect.height > y2) {
				y2 = rect.y + rect.height;
			}
			first = false;
		}
		return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
	}

	function getParentId(parentElem, index) {
		const ids = parentElem.fitlayoutID;
		if (ids) {
			if (ids.length == 1) {
				return ids[0]; //block parents
			} else {
				return ids[index]; //inline parents that generate multiple boxes
			}
		} else {
			// this may occur for root element
			return undefined;
		}
	}

	function addFonts(style, fontSet) {
		let nameStr = style['font-family'];
		nameStr.split(',').forEach((name) => {
			fontSet.add(name.trim().replace(/['"]+/g, ''));
		});
	}

	function getExistingFonts(fontSet) {
		let ret = [];
		fontSet.forEach((name) => {
			if (checkfont(name)) {
				ret.push(name);
			}
		});
		return ret;
	}

	function isVisibleElement(e) {
		if (e.nodeType === Node.ELEMENT_NODE) {

			//special type element such as <svg> -- allow only known replaced elements
			if (e.offsetParent === undefined) {
				return isReplacedElement(e);
			}

			//elements not shown such as <noscript>
			if (e.offsetParent === null && e.offsetWidth === 0 && e.offsetHeight === 0) {
				return false;
			}

			var cs = window.getComputedStyle(e, null);
			if (cs != null && cs.display === 'none' && cs.visibility === 'visible') {
				return false;
			}
			return true;
		}
		return false;
	}

	function isReplacedElement(e) {
		const tag = e.tagName.toLowerCase();
		if (replacedElements.indexOf(tag) !== -1) {
			return true;
		}
		return false;
	}

	function isImageElement(e) {
		const tag = e.tagName.toLowerCase();
		if (replacedImages.indexOf(tag) !== -1) {
			if (tag == 'img') {
				return e.hasAttribute('src'); //images must have a src specified
			} else {
				return true;
			}
		}
		return false;
	}

	function isTextElem(elem) {
		return (elem.childNodes.length == 1 && elem.firstChild.nodeType == Node.TEXT_NODE); //a single text child
	}

	function processBoxes(root, boxOffset, boxList, fontSet, imageList) {

		if (isVisibleElement(root)) {
			// get the style
			const style = window.getComputedStyle(root, null);
			addFonts(style, fontSet);
			// generate boxes
			const boxes = createBoxes(root, style, boxOffset);
			if (isTextElem(root)) {
				boxes[0].text = root.innerText;
			}
			for (box of boxes) {
				// store the box
				boxList.push(box);
				// save image ids
				if (isImageElement(root)) { //img elements
					root.setAttribute('data-fitlayoutid', box.id);
					let img = { id: box.id, bg: false };
					imageList.push(img);
				} else if (box.hasBgImage) { //background images
					root.setAttribute('data-fitlayoutid', box.id);
					//root.setAttribute('data-fitlayoutbg', '1');
					let img = { id: box.id, bg: true };
					imageList.push(img);
				}
			}

			if (!isReplacedElement(root)) //do not process the contents of replaced boxes
			{
				const multipleBoxes = (root.getClientRects().length > 1);
				let ofs = 0;
				const children = root.childNodes;
				for (let i = 0; i < children.length; i++) {
					const boxcnt = processBoxes(children[i], ofs, boxList, fontSet, imageList);
					if (multipleBoxes) {
						ofs += boxcnt; //root generates multiple boxes - track the child box offsets
					}
				}
			}

			return boxes.length;
		} else {
			return 0; //no boxes created
		}
	}

	let boxes = [];
	let images = [];
	let fonts = new Set();
	console.log(boxes);
	console.log(images);
	processBoxes(document.body, 0, boxes, fonts, images);

	let ret = {
		page: {
			width: document.body.scrollWidth,
			height: document.body.scrollHeight,
			title: document.title,
			url: location.href
		},
		fonts: getExistingFonts(fonts),
		boxes: boxes,
		images: images
	}

	return ret;
}
/*
 * fitlayout-puppeteer -- Puppeteer-based web page renderer for FitLayout
 * (c) Radek Burget 2020
 *
 * Font handling functions.
 */

/**
 * Tries to disable CSS-linked fonts.
 */
function disableCSSFonts() {
	
	for (i=0; i < document.styleSheets.length; i++) { 
		//console.log(document.styleSheets[i].href);
		let ss = document.styleSheets[i];
		if (typeof ss.href === 'string') {
			if (ss.href.indexOf('fonts.googleapis.com') !== -1) {
				ss.disabled = true;
			}
		} 
	}
}
/*
 * Line detection in a displayed web page.
 * (c) 2020 Radek Burget <burgetr@fit.vutbr.cz>
 * 
 */

function fitlayoutDetectLines() {

	var TEXT_CONT = "XX"; // element name to be used for wrapping the text nodes
	var LINE_CONT = "XL"; // element name to be used for wrapping the detected lines

	/**
	 * Finds lines in a given XX element and marks them with separate elements.
	 * @param {Element} xx the XX element to be processed.
	 */
	function createLines(xx) {
		let rects = xx.getClientRects();
		if (rects.length > 1) {
			const parent = xx.parentElement;
			lines = splitTextByLines(xx, xx.textContent, rects);
			xx.innerText = '';
			for (var line of lines) {
				parent.insertBefore(line, xx);
			}
			parent.removeChild(xx);
			return lines.length;
		} else {
			return rects.length;
		}
	}

	/**
	 * Splits the text content of a given element based on the client rectangles.
	 * 
	 * @param {Element} parent the parent element of the text node 
	 * @param {string} text the text content to be split 
	 * @param {*} rects element client rectangles to be used for splitting 
	 */
	function splitTextByLines(parent, text, rects) {
		var breaks = [];
		var lastY = 0;
		for (var i = 0; i < rects.length; i++) {
			var rect = rects[i];
			// TODO this is Chrome-specific; use caretPositionFromPoint in other browsers
			var range = document.caretRangeFromPoint(rect.x + 1, rect.y + rect.height / 2); //use +1 to be sure to hit some position
			if (range) {
				var ofs = range.startOffset;
				// detect line breaks
				if (i == 0 || rect.y != lastY) {
					breaks.push(ofs);
					lastY = rect.y;
				}
			}
		}
		breaks.push(text.length);
		//split to elements
		var lines = [];
		for (var i = 0; i < breaks.length - 1; i++) {
			var subtext = text.substring(breaks[i], breaks[i + 1]);
			var line = document.createElement(LINE_CONT);
			line.appendChild(document.createTextNode(subtext));
			lines.push(line);
		}
		return lines;
	}

	function isVisibleElement(e) {
		if (e.nodeType == Node.ELEMENT_NODE) {
			return (e.getClientRects().length > 0);
		}
		return false;
	}

	/**
	 * Replaces text nodes with XX elements to avoid mixed content.
	 * @param {Element} p the root element of the subtree to process.
	 */
	function unmix(p) {
		const children = p.childNodes;
		const isMulti = (p.getClientRects().length > 1); //preserve whitespace nodes in multi-rect elements
		// create the elements for thext nodes
		let replace = [];
		for (var i = 0; i < children.length; i++) {
			var child = children.item(i);
			if (child.nodeType == Node.TEXT_NODE && (isMulti || child.nodeValue.trim().length > 0)) {
				var newchild = document.createElement(TEXT_CONT);
				newchild.appendChild(document.createTextNode(child.nodeValue));
				replace.push(newchild);
			} else {
				replace.push(null);
				if (isVisibleElement(child)) {
					unmix(child);
				}
			}
		}
		// replace the text nodes with elements in DOM
		for (var i = 0; i < replace.length; i++) {
			if (replace[i] != null) {
				p.replaceChild(replace[i], children.item(i));
			}
		}
		// remove the text elements that are rendered as empty
		if (isMulti) {
			for (var i = 0; i < replace.length; i++) {
				if (replace[i] != null && replace[i].innerText.length == 0) {
					p.removeChild(replace[i]);
				}
			}
		}
	}

	unmix(document.body);
	var xxs = Array.from(document.getElementsByTagName(TEXT_CONT));
	for (var i = 0; i < xxs.length; i++) {
		var n = createLines(xxs[i]);
		if (n === 0) {
			console.log(xxs[i]);
		}
	}
}

		fitlayoutDetectLines();
		return fitlayoutExportBoxes();

	});

	// add a screenshot if it was required
	if (argv.s && screenShot !== null) {
		pg.screenshot = screenShot;
	}

	// capture the images if required
	if (argv.I && pg.images) {
		// hide the contents of the marked elemens
		await page.addStyleTag({content: '[data-fitlayoutbg="1"] * { display: none }'});
		// take the screenshots
		for (let i = 0; i < pg.images.length; i++) {
			let img = pg.images[i];
			let selector = '*[data-fitlayoutid="' + img.id + '"]';

			try {
				if (img.bg) {
					// for background images switch off the contents
					await page.$eval(selector, e => {
						e.setAttribute('data-fitlayoutbg', '1');
					});
				}

				let elem = await page.$(selector);
				if (elem !== null) {
					img.data = await elem.screenshot({
						type: "png",
						encoding: "base64"
					});
				}

				if (img.bg) {
					//for background images switch the contents on again
					await page.$eval(selector, e => {
						e.setAttribute('data-fitlayoutbg', '0');
					});
				}
			} catch (e) {
				//console.error('Couldn\'t capture image ' + i);
				//console.error(e);
			}
		}
	}

	await browser.close();

	process.stdout.write(JSON.stringify(pg));

})();
