//? |-----------------------------------------------------------------------------------------------|
//? |  /mainPage/core.js                                                                            |
//? |                                                                                               |
//? |  Copyright (c) 2018-2020 Belikhun. All right reserved                                         |
//? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
//? |-----------------------------------------------------------------------------------------------|

const SERVER = [
	"https://ncov-data.herokuapp.com",
	"https://corona-tracker-data.herokuapp.com",
	"https://ncov-data.000webhostapp.com"
]

const API = {
	corona: "/api/corona"
}

const core = {
	UPDATE_INTERVAL: 120000,

	vietnam: {
		container:		$("#vietnamBox"),
		lastUpdate:		$("#vietnamLastUpdate"),
		confirmed:		$("#vietnamConfirmed"),
		recovered:		$("#vietnamRecovered"),
		death:			$("#vietnamDeath"),
	},

	world: {
		container:		$("#worldBox"),
		lastUpdate:		$("#worldLastUpdate"),
		confirmed:		$("#worldConfirmed"),
		recovered:		$("#worldRecovered"),
		death:			$("#worldDeath"),
	},

	provinceList: $("#provinceList"),
	provinceListTitle: $("#provinceListTitle"),
	loadingWrapper: $("#loadingWrapper"),
	reloadTimeout: null,
	data: {},

	async init() {
		__connection__.enabled = false;
		popup.init();

		triBg(this.vietnam.container, { color: "darkRed" });
		triBg(this.world.container, { color: "dark" });

		await this.__reloadHandler();
		$("#popout").addEventListener("mouseup", () => {
			chrome.windows.create({
				url: chrome.extension.getURL("/mainPage/index.html"),
				width: 800,
				height: 600,
				type: "panel",
				setSelfAsOpener: true
			});
		});
	},

	async __reloadHandler() {
        clearTimeout(this.reloadTimeout);
        var timer = new stopClock();

        try {
            await this.reloadData();
        } catch(e) {
            //? IGNORE ERROR
            clog("ERRR", e);
        }
        
        this.reloadTimeout = setTimeout(() => this.__reloadHandler(), this.UPDATE_INTERVAL - (timer.stop * 1000));
	},
	
	__f(n) {
		return new Intl.NumberFormat().format(n)
	},

	update() {
		let _g = this.data.global;
		let _d = this.data.vietnam;


		this.world.lastUpdate.innerText	=	(new Date(this.data.global.update * 1000)).toLocaleString();
		this.world.confirmed.innerText	=	this.__f(_g.confirmed);
		this.world.recovered.innerText	=	this.__f(_g.recovered);
		this.world.death.innerText		=	this.__f(_g.deaths);

		this.vietnam.lastUpdate.innerText	= (new Date(this.data.vietnam.update * 1000)).toLocaleString();
		this.vietnam.confirmed.innerText	=	this.__f(_d.confirmed);
		this.vietnam.recovered.innerText	=	this.__f(_d.recovered);
		this.vietnam.death.innerText		=	this.__f(_d.deaths);

		emptyNode(this.provinceList);
		this.provinceListTitle.innerText = `${this.data.vietnam.list.length} Tỉnh Thành Có Ca Nhiễm COVID-19`;
		let vietnamConfirmedMax = Math.max(...this.data.vietnam.list.map((i) => i.confirmed));

		for (let item of this.data.vietnam.list) {
			let _n = buildElementTree("div", "item", [
				{ type: "t", class: "name", name: "name", text: item.name },
				{ type: "span", class: "info", name: "info" },

				{ type: "span", class: "progressBar", name: "bar", list: [
					{ type: "span", class: "bar", name: "confirmed" },
					{ type: "span", class: "bar", name: "recovered" },
					{ type: "span", class: "bar", name: "deaths" }
				]}
			])

			this.provinceList.appendChild(_n.tree);
			_n.obj.bar.confirmed.dataset.color = "yellow";
			_n.obj.bar.recovered.dataset.color = "green";
			_n.obj.bar.deaths.dataset.color = "red";
			_n.obj.bar.deaths.dataset.blink = "grow";
			_n.obj.bar.deaths.style.left = `${item.recovered / _d.confirmed * 100}%`;
			_n.obj.info.innerHTML = `<yl>${item.confirmed}</yl><s></s><gr>${item.recovered}</gr><s></s><rd>${item.deaths}</rd>`;

			setTimeout(() => {
				_n.obj.bar.confirmed.style.width = `${item.confirmed / vietnamConfirmedMax * 100}%`;
				_n.obj.bar.recovered.style.width = `${item.recovered / vietnamConfirmedMax * 100}%`;
				_n.obj.bar.deaths.style.width = `${item.deaths / vietnamConfirmedMax * 100}%`;
			}, 200);

			_n.obj.title = [
				`Cập nhật lúc ${(new Date(item.update * 1000)).toLocaleString()}`,
				``,
				`${item.confirmed} nhiễm bệnh`,
				`${item.recovered} đã hồi phục`,
				`${item.deaths} tử vong`
			].join("\n");
		}
	},

	async reloadData() {
		this.loadingWrapper.style.display = "flex";

		let popupAttemptNode = document.createElement("t");
		popupAttemptNode.classList.add("popupConnectAttempt");

		let attempt = 0;
		let host = -1;
		let data = {};

		while (true) {
			try {
				attempt++;
				host++;

				if (host > (SERVER.length - 1))
					host = 0;

				data = await this.loadData(SERVER[host] + API.corona);
			} catch(e) {
				clog("ERRR", `Cannot connect to server ${SERVER[host]} (attempt ${attempt}):`, e);

				if (attempt > 3)
					errorHandler(e);

				continue;
			}

			clog("OKAY", "Data Fetched");
			popup.hide();
			break;
		}
		
		this.data = data;
		this.update();

		this.loadingWrapper.style.display = "none";
	},

	async loadData(url) {
		let response = await myajax({ url, method: "GET" });

		if (response.data.message)
			throw { code: -1, description: `Error While Fetching Data: ${response.data.message}` }

		return response.data;
	}
}

window.addEventListener(
	"DOMContentLoaded",
	(e) => core.init().catch(errorHandler)
);