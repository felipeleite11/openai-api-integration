const express = require('express')

const { completion, createImage, textToSpeech, speechToText, translateAudioToEnglish } = require('./app/services/openai')
const { upload } = require('./app/config/multer')

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
	const { input, voice } = req.body

	const response = await textToSpeech(input, voice)

	return res.json({
		answer: response
	})
})

app.post('/speech-to-text', upload.single('input'), async (req, res) => {
	const response = await speechToText(req.file.buffer)

	return res.json({
		answer: response
	})
})

app.post('/translate', upload.single('input'), async (req, res) => {
	const response = await translateAudioToEnglish(req.file.buffer)

	console.log(response)

	return res.json({
		answer: response
	})
})

app.listen(3000, () => {
	console.log('Iniciando.... http://localhost:3000\n\n')
})