const express = require('express')

const { completion, createImage, textToSpeech } = require('./app/services/openai')

const app = express()

app.use(express.static('app/pages'))
app.use(express.static('static'))
app.use(express.json())

app.post('/completion', async (req, res) => {
	const response = await completion(req.body.input)

	return res.json({
		answer: response
	})
})

app.post('/image-creation', async (req, res) => {
	const response = await createImage(req.body.input)

	return res.json({
		answer: response
	})
})

app.post('/text-to-speech', async (req, res) => {
	const response = await textToSpeech(req.body.input)

	return res.json({
		answer: response
	})
})

app.listen(3000, () => {
	console.log('Iniciando.... http://localhost:3000\n\n')
})