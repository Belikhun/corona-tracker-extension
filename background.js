//? |-----------------------------------------------------------------------------------------------|
//? |  background.js                                                                                |
//? |                                                                                               |
//? |  Copyright (c) 2018-2019 Belikhun. All right reserved                                         |
//? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
//? |-----------------------------------------------------------------------------------------------|

const SERVER = [
	"https://dealhuntersuite.com",
	"https://ncov-data.herokuapp.com",
	"https://corona-tracker-data.herokuapp.com"
]

const API = {
	corona: "/api/corona"
}

const background = {
	UPDATE_INTERVAL: 300000,
	updateTimeout: null,

	init() {
		__connection__.enabled = false;
		
		chrome.notifications.onButtonClicked.addListener(() => chrome.windows.create({
			url: chrome.extension.getURL("/mainPage/index.html"),
			width: 800,
			height: 600,
			type: "panel",
			setSelfAsOpener: true
		}))

		this.__updateHandler();
	},

	async __updateHandler() {
        clearTimeout(this.updateTimeout);
        var timer = new stopClock();

        try {
            await this.update();
        } catch(e) {
            //? IGNORE ERROR
            clog("ERRR", e);
        }
        
        this.updateTimeout = setTimeout(() => this.__updateHandler(), this.UPDATE_INTERVAL - (timer.stop * 1000));
    },

	dataSave(data) {
		return new Promise((resolve, reject) => {
			chrome.storage.local.set(data, (res) => {
				clog("OKAY", "Data saved into chrome storage", data);
				resolve(res);
			});
		})
	},
	
	dataLoad(...key) {
		return new Promise((resolve, reject) => {
			chrome.storage.local.get(key, (res) => {
				clog("INFO", "Fetch data from chrome storage success", res);
				resolve(res);
			});
		})
	},

	async loadData(url) {
		let response = await myajax({ url, method: "GET", changeState: false });

		if (response.data.message)
			throw { code: -1, description: `Error While Fetching Data: ${response.data.message}` }

		return response.data;
	},

	async update() {
		clog("INFO", "Updating Data");

		let start = time();
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

				if (attempt > 10)
					return;

				await delayAsync(2000);
				continue;
			}
	
			clog("OKAY", "Data Fetched");
			break;
		}
	
		let saved = await this.dataLoad("previousData");
		let message = "Bạn sẽ nhận được thông báo khi có thay đổi về số liệu";
		let n = data.vietnam;
		let list = [];

		if (saved.previousData) {
			let p = saved.previousData;
			message = "Việt Nam hiện đang có:";

			if (n.confirmed > p.confirmed || n.recovered > p.recovered || n.deaths > p.deaths)
				list = [
					{ title: `${n.confirmed}`, message: `ca nhiễm bệnh (+${n.confirmed - p.confirmed})`},
					{ title: `${n.recovered}`, message: `ca đã hồi phục (+${n.recovered - p.recovered})`},
					{ title: `${n.deaths}`, message: `ca tử vong (+${n.deaths - p.deaths})`}
				]
		} else
			list = [
				{ title: `${n.confirmed}`, message: `ca nhiễm bệnh`},
				{ title: `${n.recovered}`, message: `ca đã hồi phục`},
				{ title: `${n.deaths}`, message: `ca tử vong`}
			]

		if (list.length !== 0)
			chrome.notifications.create({
				type: "list",
				title: message,
				message: "",
				items: list,
				buttons: [
					{ title: "Xem" }
				],
				iconUrl: "/assets/img/icon@128x128.png",
				contextMessage: `${(time() - start).toFixed(2)}s`
			})

		await this.dataSave({ previousData: data.vietnam });
	}
}

background.init();