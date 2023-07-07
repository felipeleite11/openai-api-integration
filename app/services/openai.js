require('dotenv/config')

const { resolve } = require('path')
const fs = require('fs')

const { Configuration, OpenAIApi } = require('openai')

const configuration = new Configuration({
  	apiKey: process.env.OPENAI_KEY
})

const openai = new OpenAIApi(configuration)

async function completion(userInput = 'Oi!') {
	const completion = await openai.createChatCompletion({
		model: 'gpt-3.5-turbo',
		messages: [
			// { role: 'system', content: 'Você é uma secretária virtual e, ao ser saudada, deve deixar claras suas atribuições.' },
			{ role: 'system', content: 'Você é um assistente capaz executar pequenas tarefas, como cálculos matemáticos, traduções de frases e sugestão de receitas.' },
			{ role: 'user', content: userInput }
		]
	})

	console.log('User input:', userInput)
	console.log('ChatGPT answer:', completion.data.choices[0].message.content, '\n\n')

	return completion.data.choices[0].message.content
}

async function createImage() {
	const userInput = 'A broken blue pencil'
	const numberOfImages = 1
	
	const response = await openai.createImage({
		prompt: userInput,
		n: numberOfImages,
		size: '1024x1024',
	})

	console.log('User input:', userInput)
	console.log('ChatGPT answer:', response.data.data[0].url)
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

// completion()

// createImage()

// transcriptAudio()

// translateAudioToEnglish()

module.exports = {
	completion,
	createImage,
	transcriptAudio,
	translateAudioToEnglish
}