require('dotenv/config')

const { resolve } = require('path')
const fs = require('fs')

const OpenAI = require('openai')

const openai = new OpenAI({
	apiKey: process.env.OPENAI_KEY
})

async function completion(userInput = 'Oi!') {
	const completion = await openai.createChatCompletion({
		model: 'gpt-3.5-turbo',
		messages: [
			// { role: 'system', content: 'Você é uma secretária virtual e, ao ser saudada, deve deixar claras suas atribuições.' },
			// { role: 'system', content: 'Você é um assistente capaz executar pequenas tarefas, como cálculos matemáticos e tradução de frases.' },
			{ role: 'user', content: userInput }
		]
	})

	console.log('User input:', userInput)
	console.log('ChatGPT answer:', completion.data.choices[0].message.content, '\n\n')

	return completion.data.choices[0].message.content
}

async function createImage(userInput) {
	if(!userInput) {
		return null
	}

	const numberOfImages = 1
	
	const response = await openai.createImage({
		prompt: userInput,
		n: numberOfImages,
		size: '1024x1024',
	})

	console.log('User input:', userInput)
	console.log('ChatGPT answer:', response.data.data[0].url)

	return response.data.data[0].url
}

async function textToSpeech(userInput, voice) {
	if(!userInput) {
		return null
	}

	const baseURL = 'http://localhost:3000'

	try {
		const files = fs.readdirSync('static')

		const nextIndex = files.length + 1

		const generatedFileName = `transcription_${nextIndex}.mp3`
		
		const audio = await openai.audio.speech.create({
			model: 'tts-1',
			voice: voice || 'nova',
			input: userInput
		})

		if(!audio) {
			throw new Error()
		}

		fs.rm(`static/${generatedFileName}`, () => {})
		
		const buffer = Buffer.from(await audio.arrayBuffer())

		fs.writeFile(`static/${generatedFileName}`, buffer, () => {})
		
		console.log('User input:', userInput)

		return `${baseURL}/${generatedFileName}`
	} catch(e) {
		return null
	}
}

async function speechToText(userInput) {
	if(!userInput) {
		return null
	}

	try {
		const filePath = 'static/audio.wav'

		fs.rm('static/audio.wav', () => {})

		fs.writeFile(filePath, userInput, () => {})

		const readStream = fs.createReadStream(filePath)

		const transcription = await openai.audio.transcriptions.create({
			model: 'whisper-1',
			file: readStream,
			response_format: 'text',
			language: 'pt'
		})

		if(!transcription) {
			throw new Error()
		}

		console.log('Transcription: ', transcription)

		return transcription
	} catch(e) {
		console.log(e)
		
		return null
	}
}

async function transcriptAudio() {
	const audioPath = resolve(__dirname, '..', 'assets', 'audio.m4a')

	const response = await openai.createTranscription({
		file: fs.createReadStream(audioPath),
		model: 'whisper-1',
		language: 'pt'
	})

	console.log('Transcription: ', response.data.text)
}

async function translateAudioToEnglish() {
	const audioPath = resolve(__dirname, '..', 'assets', 'audio.m4a')

	const response = await openai.createTranslation({
		file: fs.createReadStream(audioPath),
		model: 'whisper-1',
		language: 'pt'
	})

	console.log('Transcription: ', response.data.text)
}

module.exports = {
	completion,
	createImage,
	transcriptAudio,
	translateAudioToEnglish,
	textToSpeech,
	speechToText
}