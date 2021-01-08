function fitlayoutExportBoxes() {

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
