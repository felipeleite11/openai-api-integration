const express = require('express')

const { completion } = require('./app/services/openai')

const app = express()

app.use(express.static('app/pages'))
app.use(express.json())

app.post('/ask', async (req, res) => {
	const response = await completion(req.body.input)

	return res.json({
		answer: response
	})
})

app.listen(3000, () => {
	console.log('Iniciando.... http://localhost:3000\n\n')
})