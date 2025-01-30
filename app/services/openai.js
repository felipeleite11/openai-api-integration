require('dotenv/config')

const axios = require('axios')
const fs = require('fs')
const OpenAI = require('openai')
const { delay } = require('../utils/time')

const openai = new OpenAI({
	apiKey: process.env.OPENAI_KEY
})

const baseURL = process.env.BASE_URL || 'https://openai.robot.rio.br'

async function completion(userInput = 'Oi!') {
	const response = await openai.chat.completions.create({
		messages: [
			{ role: "system", content: "Você responde qualquer pergunta em português." },
			{ role: 'user', content: userInput }
		],
		model: 'gpt-3.5-turbo',
		// max_tokens: 40
	})

	console.log('User input:', userInput)
	console.log('ChatGPT answer:', response.choices[0].message.content, '\n\n')

	return response.choices[0].message.content
}

async function createImage(userInput) {
	if (!userInput) {
		return null
	}

	const response = await openai.images.generate({
		prompt: userInput,
		model: 'dall-e-3',
		
		// Modelo 'dall-e-2' suporta os parâmetros size e n.
		// model: 'dall-e-2',
		// n: 1, // número de imagens geradas
		// size: '1024x1024' // 512x512
	})
	
	const [image] = response.data

	console.log('User input:', userInput)
	console.log('\nChatGPT answer:', image.url)

	return image.url
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

async function translateAudioToEnglish(userInput, extension) {
	if (!userInput) {
		return null
	}

	try {
		const filePath = `static/audio${extension}`

		fs.rm(filePath, () => {})

		fs.writeFile(filePath, userInput, () => {})

		const readStream = fs.createReadStream(filePath)

		// Atualmente, traduz somente para inglês
		
		const response = await openai.audio.translations.create({
			model: 'whisper-1',
			file: readStream
		})

		return response.text
	} catch (e) {
		console.log(e)

		return null
	}
}

async function completionFromAudio(userInput, extension, voice = 'nova') {
	if (!userInput) {
		return null
	}

	try {
		// Captura do áudio da pergunta
		const filePath = `static/audio${extension}`

		fs.rm(filePath, () => {})

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
			voice,
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

async function sendToAssistant(input, assistant_id = 'asst_8aPrW9p7d26MenUNqPFpxI87') { // Assistente Sol: https://platform.openai.com/assistants/asst_8aPrW9p7d26MenUNqPFpxI87
	// TUTORIAL: https://youtu.be/qOyNqGclSV4?si=KdJFvp-wzyyL28u7&t=503

	const thread = await openai.beta.threads.create({
		messages: [
			{
				role: 'user',
				content: input
			}
		]
	})

	let run = await openai.beta.threads.runs.create(thread.id, {
		assistant_id
	})

	while(run.status !== 'completed') {
		run = await openai.beta.threads.runs.retrieve(thread.id, run.id)

		await delay(500)
	}

	const messagesOfThread = await openai.beta.threads.messages.list(thread.id, {
		run_id: run.id,
		limit: 1
	})

	const firstMessage = messagesOfThread.data[0]

	return firstMessage.content[0].text.value
}

async function chatCompletion(input, messagesInMemory = 2) {
	if(messagesInMemory <= 0) {
		throw new Error('messagesInMemory deve ser >= 1.')
	}

	// Representa todas as mensagens trocadas entre o assistente e este usuário.
	const messages = [
		{ 
			role: 'developer', 
			content: 'Você realiza cálculos matemáticos simples.'
		},
		{
			role: 'user', 
			content: 'Quanto é 4 + 4?'
		},
		{
			role: 'assistant', 
			content: 'É 8.'
		},
		{
			role: 'user', 
			content: input
		}
	]

	const completion = await openai.chat.completions.create({
		model: 'gpt-3.5-turbo',
		messages: messages.slice(messages.length - messagesInMemory)
	})

	const [response] = completion.choices

	return response
}

module.exports = {
	completion,
	createImage,
	translateAudioToEnglish,
	textToSpeech,
	speechToText,
	completionFromAudio,
	listAssistants,
	retrieveAssistant,
	sendToAssistant,
	chatCompletion
}