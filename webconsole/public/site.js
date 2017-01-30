let currentPath = "";

function get(url, callback) {
	var xhp = new XMLHttpRequest();
	xhp.open("GET", url);
	xhp.onreadystatechange = () => {
		if (xhp.readyState == 4 && xhp.status == 200)
			callback(xhp.responseText);
	};
	xhp.send();
}

function post(url, data, callback) {
	var xhp = new XMLHttpRequest();
	xhp.open("POST", url);
	xhp.setRequestHeader("Content-Type", "application/json");
	xhp.onreadystatechange = () => {
		if (xhp.readyState == 4 && xhp.status == 200)
			callback(xhp.responseText);
	};
	xhp.send(JSON.stringify(data));
}

function getParentPath(path) {
	while (path.endsWith("\\") || path.endsWith("/"))
		path = path.slice(0, -1);

	return path.substring(0, Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/")));
}

function reloadQueue() {
	get("/queue/list", data => {
		let queue = JSON.parse(data);
		let queueNode = document.querySelector("#queue-list");
		queueNode.innerHTML = "";

		let template = document.querySelector("#templates .list-item");

		for (let i = 0; i < queue.length; i++)
		{
			let file = queue[i];
			let listItem = template.cloneNode(true);
			listItem.querySelector(".list-item-text").innerHTML = file;
			listItem.querySelector(".list-item-text").title = file;
			listItem.querySelector(".list-item-button").innerHTML = "Remove";
			listItem.querySelector(".list-item-index").innerHTML = (i + 1) + ".";
			listItem.querySelector(".list-item-button").addEventListener("click", () => {
				post("/queue/remove", { index: i }, res => {
					reloadQueue();
				});
			});
			queueNode.appendChild(listItem);
		}
	});
}

function reloadList(folders, files) {
	//Clear the list
	let listNode = document.querySelector("#listing-container ul");
	listNode.innerHTML = "";

	let template = document.querySelector("#templates .list-item");

	//.. item
	let listItem = template.cloneNode(true);
	listItem.className += " folder";
	listItem.querySelector(".list-item-text").innerHTML = "..";
	listItem.addEventListener("click", () => {
		//Normalize slashes
		let newPath = getParentPath(currentPath);
		getListing(newPath);
	});
	listNode.appendChild(listItem);


	for (let folder of folders) {
		let listItem = template.cloneNode(true);
		listItem.className += " folder";
		listItem.querySelector(".list-item-text").innerHTML = folder;
		listItem.addEventListener("click", () => {
			let delim = currentPath.includes("\\") ? "\\" : "/";
			delim = (currentPath.endsWith("\\") || currentPath.endsWith("/")) ? "" : delim;
			let newPath = currentPath + delim + folder;
			getListing(newPath);
		});
		listNode.appendChild(listItem);
	}

	for (let file of files) {
		let listItem = template.cloneNode(true);
		listItem.className += " file";
		listItem.querySelector(".list-item-text").innerHTML = file;
		listItem.querySelector(".list-item-button").addEventListener("click", () => {
			let delim = currentPath.includes("\\") ? "\\" : "/";
			post("/queue/add", { path: currentPath + delim + file }, res => {
				if (res == "Added")
					setTimeout(() => reloadQueue(), 500);
				else
					alert("Couldn't add file, server responded with:\n" + res);
			});
		});
		listNode.appendChild(listItem);
	}
}

function getListing(path) {
	console.log(path);
	post("/fs/query", { path: path }, data => {
		let obj = JSON.parse(data);
		let folders = obj.folders;
		let files = obj.files;

		currentPath = path;
		document.querySelector("#path-textbox").value = path;
		reloadList(folders, files);
	});
}

document.addEventListener("DOMContentLoaded", () => {
	reloadQueue();

	let textbox = document.querySelector("#path-textbox");
	textbox.addEventListener("keyup", (e) => {
		if (e.keyCode == 13) {
			getListing(textbox.value);
		}
	});
});
