async function delay(timeout) {
	return new Promise((r) => {
		setTimeout(() => { r(true) }, timeout)
	})
}

module.exports = {
	delay
}