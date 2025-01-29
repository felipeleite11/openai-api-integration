const express = require('express')
const cors = require('cors')
const { extname } = require('path')

const { completion, createImage, textToSpeech, speechToText, translateAudioToEnglish, completionFromAudio, listAssistants, retrieveAssistant, sendToAssistant } = require('./app/services/openai')
const { upload } = require('./app/config/multer')

const app = express()

app.use(express.static('app/pages'))
app.use(express.static('app/lib'))
app.use(express.static('app/assets'))
app.use(express.static('static'))
app.use(express.json())
app.use(cors())

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
	const extension = extname(req.file.originalname)

	const response = await translateAudioToEnglish(req.file.buffer, extension)

	return res.json({
		answer: response
	})
})

app.post('/completion_from_audio', upload.single('input'), async (req, res) => {
	const extension = extname(req.file.originalname)

	const response = await completionFromAudio(req.file.buffer, extension)

	return res.json(response)
})

app.get('/list_assistants', async (req, res) => {
	const response = await listAssistants()

	return res.json(response)
})

// 'id' pattern: asst_8aPrW9p7d26MenUNqPFpxI87
app.get('/retrieve_assistant/:id', async (req, res) => {
	const response = await retrieveAssistant(req.params.id)

	return res.json(response)
})

app.post('/assistant_chat', async (req, res) => {
	const { input, assistant_id } = req.body

	const response = await sendToAssistant(input, assistant_id)

	return res.json({
		answer: response
	})
})

app.listen(8030, () => {
	console.log('Iniciando.... http://localhost:8030\n\n')
})