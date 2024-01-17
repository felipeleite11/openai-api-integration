require('dotenv/config')

const fs = require('fs')

const OpenAI = require('openai')

const openai = new OpenAI({
	apiKey: process.env.OPENAI_KEY
})

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
	if(!userInput) {
		return null
	}

	const numberOfImages = 1
	
	// TODO: Erro
	// const response = await openai.createImage({
	// 	prompt: userInput,
	// 	n: numberOfImages,
	// 	size: '1024x1024',
	// })

	console.log(openai.images)

	// const response = await openai.images.create({
	// 	model: 'dall-e-3',
	// 	prompt: userInput,
	// 	n: numberOfImages,
	// 	size: '1024x1024',
	// })

	// console.log('User input:', userInput)
	// console.log('ChatGPT answer:', response.data[0].url)

	// return response.data.data[0].url
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

async function translateAudioToEnglish(userInput) {
	if(!userInput) {
		return null
	}

	try {
		const filePath = 'static/audio.wav'

		fs.rm('static/audio.wav', () => {})

		fs.writeFile(filePath, userInput, () => {})

		const readStream = fs.createReadStream(filePath)

		const response = await openai.audio.translations.create({
			model: 'whisper-1',
			file: readStream,
			language: 'en'
		})

		return response.text
	} catch(e) {
		console.log(e)
		
		return null
	}
}

module.exports = {
	completion,
	createImage,
	translateAudioToEnglish,
	textToSpeech,
	speechToText
}