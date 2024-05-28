require('dotenv/config')

const axios = require('axios')
const fs = require('fs')
const OpenAI = require('openai')

const openai = new OpenAI({
	apiKey: process.env.OPENAI_KEY
})

const baseURL = 'https://openai.robot.rio.br'

async function completion(userInput = 'Oi!') {
	const response = await openai.chat.completions.create({
		messages: [
			{ role: "system", content: "Você responde qualquer pergunta em português." },
			{ role: 'user', content: userInput }
		],
		model: 'gpt-3.5-turbo',
		max_tokens: 40
	})

	console.log('User input:', userInput)
	console.log('ChatGPT answer:', response.choices[0].message.content, '\n\n')

	return response.choices[0].message.content
}

async function createImage(userInput) {
	if (!userInput) {
		return null
	}

	const numberOfImages = 1

	const { data: response } = await axios.post('https://api.openai.com/v1/images/generations', {
		prompt: userInput,
		model: 'dall-e-2',
		n: numberOfImages,
		size: '1024x1024'
	}, {
		headers: {
			Authorization: `Bearer ${process.env.OPENAI_KEY}`
		}
	})

	console.log('User input:', userInput)
	console.log('\nChatGPT answer:', response.data[0].url)

	return response.data[0].url
}

async function textToSpeech(userInput, voice) {
	if (!userInput) {
		return null
	}

	try {
		const files = fs.readdirSync('static')

		const nextIndex = files.length + 1

		const generatedFileName = `transcription_${nextIndex}.mp3`

		const audio = await openai.audio.speech.create({
			model: 'tts-1',
			voice: voice || 'nova',
			input: userInput
		})

		if (!audio) {
			throw new Error()
		}

		fs.rm(`static/${generatedFileName}`, () => { })

		const buffer = Buffer.from(await audio.arrayBuffer())

		fs.writeFile(`static/${generatedFileName}`, buffer, () => { })

		console.log('User input:', userInput)

		return `${baseURL}/${generatedFileName}`
	} catch (e) {
		return null
	}
}

async function speechToText(userInput) {
	if (!userInput) {
		return null
	}

	try {
		const filePath = 'static/audio.wav'

		fs.rm('static/audio.wav', () => { })

		fs.writeFile(filePath, userInput, () => { })

		const readStream = fs.createReadStream(filePath)

		const transcription = await openai.audio.transcriptions.create({
			model: 'whisper-1',
			file: readStream,
			response_format: 'text',
			language: 'pt'
		})

		if (!transcription) {
			throw new Error()
		}

		console.log('Transcription: ', transcription)

		return transcription
	} catch (e) {
		console.log(e)

		return null
	}
}

async function translateAudioToEnglish(userInput) {
	if (!userInput) {
		return null
	}

	try {
		const filePath = 'static/audio.wav'

		fs.rm('static/audio.wav', () => { })

		fs.writeFile(filePath, userInput, () => { })

		const readStream = fs.createReadStream(filePath)

		const response = await openai.audio.translations.create({
			model: 'whisper-1',
			file: readStream,
			language: 'en'
		})

		return response.text
	} catch (e) {
		console.log(e)

		return null
	}
}

async function completionByAudio(userInput, voice) {
	if (!userInput) {
		return null
	}

	try {
		// Captura do áudio da pergunta
		const filePath = 'static/audio.wav'

		fs.rm('static/audio.wav', () => { })

		fs.writeFile(filePath, userInput, () => { })

		const readStream = fs.createReadStream(filePath)

		// Transformando pergunta em texto
		const transcription = await openai.audio.transcriptions.create({
			model: 'whisper-1',
			file: readStream,
			response_format: 'text',
			language: 'pt'
		})

		// Enviando pergunta para o Completions e recenbendo a resposta
		const response = await openai.chat.completions.create({
			messages: [
				{ role: 'user', content: transcription }
			],
			model: 'gpt-3.5-turbo',
			max_tokens: 40
		})

		const answer = response.choices[0].message.content

		// Sintetização da resposta em áudio
		const files = fs.readdirSync('static')

		const nextIndex = files.length + 1

		const generatedFileName = `completion_${nextIndex}.mp3`

		const audio = await openai.audio.speech.create({
			model: 'tts-1',
			voice: voice || 'nova',
			input: answer
		})

		if (!audio) {
			throw new Error()
		}

		fs.rm(`static/${generatedFileName}`, () => { })

		const buffer = Buffer.from(await audio.arrayBuffer())

		fs.writeFile(`static/${generatedFileName}`, buffer, () => { })

		console.log('question:', transcription)
		console.log('answer:', answer)
		console.log('audio URL:', `${baseURL}/${generatedFileName}`)

		return {
			question: transcription,
			answer_text: answer,
			answer_audio: `${baseURL}/${generatedFileName}`
		}
	} catch (e) {
		console.log(e)

		return null
	}
}

async function listAssistants() {
	const { data: assistants } = await openai.beta.assistants.list()

	return assistants
}

async function retrieveAssistant(assistanteId) {
	const assistant = await openai.beta.assistants.retrieve(assistanteId)

	return assistant
}

async function sendToAssistant() {
	// https://platform.openai.com/playground/assistants?assistant=asst_qV8lLXtQS8CnflMsnO5r45wf&mode=assistant&thread=thread_MkkTesdkkEB1pwLR32igvi5b

	// TUTORIAL: https://youtu.be/qOyNqGclSV4?si=KdJFvp-wzyyL28u7&t=503

	// Create a thread
	// POST/v1/threads
	// Add a message
	// POST/v1/threads/thread_MkkTesdkkEB1pwLR32igvi5b/messages
	// Run the thread
	// 64 events
	// POST/v1/threads/thread_MkkTesdkkEB1pwLR32igvi5b/runs
}

module.exports = {
	completion,
	createImage,
	translateAudioToEnglish,
	textToSpeech,
	speechToText,
	completionByAudio,
	listAssistants,
	retrieveAssistant
}