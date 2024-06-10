/*
	IDEIAS
	OK - Minimizar chat
	OK - Emitir sons de alerta
	OK - Permitir mutar os sons
	OK - Tratar links
	OK - Inserir animações ao minimizar e maximizar o chat
	OK - permitir mídias (imagens, vídeos, áudios)
	OK - Permitir ampliar imagens e vídeos em um modal
	OK - Permitir copiar mensagem ao clicar em um balloon
	OK - Permitir escolher posição do chat
	OK - Permitir escolher tema dark ou light (aplicar classes do Tailwind e deixar o navegador decidir o tema)
	OK - Personalizar exibição da tag audio
	OK - Permitir acelerar o áudio
	OK - Tratar quando o nome do participante é muito extenso (usar ellipsis)
	- Exportar conversa para texto único (copiar para área de transferência)
	- Permitir upload de imagens
	OK - Permitir gravação de áudios
	- Permitir gravação de vídeos
	- Ao iniciar um áudio, certificar de que todos os outros estejam parados
	OK - Áudios gravados e enviados devem ser persistidos no Minio
	OK - Permitir previsualizar o áudio gravado, mostrando progresso

	ERROS
	- O menu não consegue reativar os sons para novas mensagens
	- Em áudios gravados, o cursor não vai até o final
*/

const { createContext, useState, useContext, useEffect, useRef, useCallback } = React
const { format, startOfDay, addSeconds } = dateFns

const animations = {
	balloonIn: 'animate__animated animate__flipInX',
	avatarIn: 'animate__animated animate__bounceIn'
}

let recordingChunks = []
let camStream
let video

// TODO: Temporary
async function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

		reader.readAsDataURL(blob)

        reader.onloadend = () => {
            resolve(reader.result)
        }

        reader.onerror = reject
    })
}

const storage = {
	async store(blob, extension) {
		try {
			const formData = new FormData()

			formData.append('file', blob, `file${extension}`)

			const { data } = await axios.post('http://localhost:3333/test_api/upload_minio', formData)

			return data.link
		} catch(e) {
			alert(e.message)
		}
	},

	async storeBKP(blob) {
		try {
			// TODO: Temporary
			const base64 = await blobToBase64(blob)

			return base64
		} catch(e) {
			alert(e.message)
		}
	}
}

const soundNewMessage = new Howl({
	src: ['notification.ogg']
})

const soundMaximize = new Howl({
	src: ['click.mp3']
})

const soundChangePosition = new Howl({
	src: ['move.mp3']
})

const GlobalContext = createContext()

function GlobalProvider({ children }) {
	const [title, setTitle] = useState('Syndi')
	const [me, setMe] = useState({
		id: 1,
		name: 'Felipe',
		avatar: 'test/avatar.jpg'
	})
	const [him, setHim] = useState({
		id: 2,
		name: 'Syndi',
		avatar: 'test/avatar2.jpeg',
		isOnline: true
	})
	const [participants, setParticipants] = useState([
		me,
		him
	])
	const [messages, setMessages] = useState([
		// {
		// 	id: 1,
		// 	sender: participants[0],
		// 	content: 'Olá, sou Felipe!',
		// 	sent_at: new Date('2024-05-30 08:00:00'),
		// 	type: 'text'
		// },
		// {
		// 	id: 2,
		// 	sender: participants[1],
		// 	content: 'Auto answer with link: https://chatgpt.com/c/f98c122e-437c-43ab-b316-d5c3d5c8bdc2',
		// 	sent_at: new Date('2024-05-30 08:02:00'),
		// 	type: 'text'
		// },
		// {
		// 	id: 3,
		// 	sender: participants[1],
		// 	media: 'https://img.freepik.com/fotos-gratis/rvore-de-notas-de-dolar-crescendo-em-um-vaso-branco_35913-3163.jpg',
		// 	sent_at: new Date('2024-05-30 08:05:00'),
		// 	type: 'image',
		// 	content: 'Esta é minha imagem'
		// },
		// {
		// 	id: 4,
		// 	sender: participants[1],
		// 	media: 'test/video.mp4', //'https://integrare-os-minio.nyr4mj.easypanel.host/integrare-os/video.mp4',
		// 	sent_at: new Date('2024-05-30 08:07:00'),
		// 	type: 'video',
		// 	content: 'Este é meu vídeo'
		// },
		// {
		// 	id: 5,
		// 	sender: participants[1],
		// 	media: 'https://integrare-os-minio.nyr4mj.easypanel.host/integrare-os/9440d329-2f80-4230-b961-623f6e82855b..mp3',
		// 	sent_at: new Date('2024-05-30 08:10:00'),
		// 	type: 'audio',
		// 	content: 'Este é o áudio da Syndi'
		// },
		{
			id: 6,
			sender: participants[0],
			media: 'https://integrare-os-minio.nyr4mj.easypanel.host/integrare-os/2e12f34e-0cc9-4f81-88b0-5e731a32861a..MP3',
			sent_at: new Date('2024-05-30 08:12:00'),
			type: 'audio',
			content: 'Este é meu áudio'
		}
	])
	const [mediaDetail, setMediaDetail] = useState(null)
	const [answeringText, setAnsweringText] = useState(null)
	const [isMinimized, setIsMinimized] = useState(false)
	const [isSoundEnable, setIsSoundEnable] = useState(false)
	const [position, setPosition] = useState('center')
	const [isMenuVisible, setIsMenuVisible] = useState(false)
	const [isMenuTouched, setIsMenuTouched] = useState(false)

	function scrollToEnd() {
		const container = document.querySelector('#messages-container')

		container.scrollTop = container.scrollHeight
	}

	const addMessage = useCallback(({ sender, content, media, type = 'text' }) => {
		setMessages(old => [...old, {
			id: new Date().toISOString(),
			sender,
			content,
			media,
			type,
			sent_at: new Date()
		}])

		setTimeout(() => {
			scrollToEnd()

			if(sender.id !== me.id && isSoundEnable) {
				soundNewMessage.play()
			}
		}, 200)
	}, [isSoundEnable])

	useEffect(() => {
		if(isMenuVisible) {
			setIsMenuTouched(true)
		}
	}, [isMenuVisible])

	useEffect(() => {
		if(isMenuTouched && isSoundEnable) {
			soundChangePosition.play()
		}
	}, [position])

	useEffect(() => {
		if(!isMinimized) {
			setTimeout(() => {
				scrollToEnd()
			}, 400)
		}
	}, [isMinimized])

	return (
		<GlobalContext.Provider value={{
			title,
			participants,
			me,
			him,
			messages,
			answeringText,
			position,
			isMinimized,
			isSoundEnable,
			isMenuVisible,
			mediaDetail,

			setAnsweringText,
			setIsMinimized,
			setIsSoundEnable,
			setPosition,
			setIsMenuVisible,
			setMediaDetail,

			addMessage
		}}>
			{children}
		</GlobalContext.Provider>
	)
}

function Header() {
	const { title, him, setIsMinimized, isMinimized, setIsMenuVisible, isSoundEnable } = useContext(GlobalContext)

	return (
		<div id="chatbox-header" className="bg-slate-100 dark:bg-slate-700 h-11 flex justify-between items-center pl-3 pr-2 text-sm text-slate-600 dark:text-slate-200 rounded-t-md z-20">
			<div 
				className="flex gap-3 items-center"
				// onMouseEnter={() => {
				// 	setIsMenuVisible(false)
				// }}
			>
				<img 
					src={him.avatar} 
					alt={him.name} 
					className={`
						h-8 w-8 rounded-full shadow-lg transition-all 
						${him.isOnline ? 'border-2 border-emerald-500' : ''}
					`} 
				/>

				<span className="overflow-hidden text-ellipsis whitespace-nowrap w-[170px]">
					{title}
				</span>
			</div>

			<div className="flex gap-1">
				{!isMinimized && (
					<>
						<div 
							className="hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md p-1 cursor-pointer flex justify-center items-center text-slate-600 dark:text-slate-300" 
							onClick={() => { setIsMenuVisible(old => !old) }}
						>
							{!isMinimized && <ion-icon name="menu-outline" size="small"></ion-icon>}
						</div>
						
						<Menu />
					</>
				)}

				<div 
					className="hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md p-1 cursor-pointer flex justify-center items-center text-slate-600 dark:text-slate-300" 
					onClick={() => {
						setIsMenuVisible(false)

						setIsMinimized(old => {
							if(old && isSoundEnable) {
								soundMaximize.play()
							}

							return !old
						})
					}}
				>
					<ion-icon name={isMinimized ? 'chevron-up-outline' : 'chevron-down-outline'} size="small"></ion-icon>
				</div>
			</div>
		</div>
	)
}

function Balloon({ participant, content, media, whoami, sent_at, type }) {
	const { setMediaDetail } = useContext(GlobalContext)

	function printContent() {
		switch(type) {
			case 'image': return (
				<div 
					className={`
						chatbox-balloon-content cursor-pointer text-slate-800 dark:text-slate-200
						${whoami === 'me' ? 'text-slate-700 dark:text-slate-200' : 'text-slate-700 dark:text-slate-600'}
					`}
				>
					<div className="hover:opacity-80 flex flex-col gap-2" onClick={() => { setMediaDetail({ content, type, media }) }}>
						<img src={media} className="w-full object-cover rounded-md"  />
						
						{content && (
							<p>{content}</p>
						)}
					</div>
				</div>
			)
			case 'video': return (
				<div 
					className={`
						chatbox-balloon-content cursor-pointer text-slate-800 dark:text-slate-200
						${whoami === 'me' ? 'text-slate-700 dark:text-slate-200' : 'text-slate-700 dark:text-slate-600'}
					`}
				>
					<div className="hover:opacity-80 flex flex-col gap-2" onClick={() => { setMediaDetail({ content, type, media }) }}>
						<video src={media} className="w-full object-cover rounded-md"  />
						<div className="absolute top-[42%] left-[42%] text-gray-200">
							<ion-icon name="play-circle-outline" size="large"></ion-icon>
						</div>

						{content && (
							<p>{content}</p>
						)}
					</div>
				</div>
			)
			case 'audio': return (
				<div 
					className={`
						chatbox-balloon-content cursor-pointer text-slate-800 dark:text-slate-200
						${whoami === 'me' ? 'text-slate-700 dark:text-slate-200' : 'text-slate-700 dark:text-slate-600'}
					`}
				>
					<AudioPlayer media={media} whoami={whoami} />
					
					{content && (
						<p className="mt-2">{content}</p>
					)}
				</div>
			)
			default: return (
				<div 
					className={`
						chatbox-balloon-content cursor-pointer text-slate-800 dark:text-slate-200
						${whoami === 'me' ? 'text-slate-700 dark:text-slate-200' : 'text-slate-700 dark:text-slate-600'}
					`}
					data-tippy-content="Copiar"
					onClick={e => {
						const tempInput = document.createElement('textarea')
						tempInput.value = e.target.innerHTML
						document.body.appendChild(tempInput)
						tempInput.select()
						document.execCommand('copy')
						document.body.removeChild(tempInput)
					}}
				>
					<div dangerouslySetInnerHTML={{ __html: prepareLinks(content) }} />
				</div>
			)
		}
	}

	function prepareLinks(text) {
		const urlPattern = /(\b(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}(?:\/[^\s]*)?\b)/g;

		const handledText = text.replace(urlPattern, '<a href="$1" target="_blank" class="text-sky-600 hover:font-semibold">$1</a>')

		return handledText
	}

	return (
		<div 
			className={`
				chatbox-balloon chatbot-balloon-${whoami} text-sm rounded-md p-2 pb-1 shadow-md w-[80%] flex flex-col gap-1
				${whoami === 'me' ? 'bg-slate-100 dark:bg-slate-600 self-end' : 'bg-slate-100 text-slate-800 self-start'}
				${animations.balloonIn}
			`}
		>
			<span className={`text-xs font-semibold opacity-90 ${whoami === 'me' ? 'text-slate-700 dark:text-slate-200' : 'text-slate-600'}`}>
				{participant.name}
			</span>

			{printContent()}

			<span className={`
				text-[0.6rem] self-end opacity-50 
				${whoami === 'me' ? 'text-slate-700 dark:text-slate-200' : 'text-slate-700 dark:text-slate-600'}
			`}>
				{format(sent_at, 'HH:mm')}
			</span>
		</div>
	)
}

function Message({ sender, content, media, whoami, sent_at, type }) {
	return (
		<div className="chatbox-message flex gap-3">
			{whoami === 'him' && (
				<img src={sender.avatar} alt={sender.name} className={`h-8 w-8 rounded-full shadow-md ${animations.avatarIn}`} />
			)}
			
			<Balloon 
				participant={sender} 
				content={content}
				media={media}
				type={type}
				whoami={whoami}
				sent_at={sent_at}
			/>

			{whoami === 'me' && (
				<img src={sender.avatar} alt={sender.name} className={`h-8 w-8 rounded-full shadow-md ${animations.avatarIn}`} />
			)}
		</div>
	)
}

// TUTORIAL CAMERA: https://codepen.io/vabarbosa/pen/VJByJW?editors=0010

function Camera({ onConfirmPhoto }) {
	const { addMessage, me } = useContext(GlobalContext)

	const [isCameraOpen, setIsCameraOpen] = useState(false)
	const [photoTaken, setPhotoTaken] = useState(null)
	const [photoTakenBlob, setPhotoTakenBlob] = useState(null)
	const [isUploading, setIsUploading] = useState(false)

	async function setupCamera() {
		if (!camStream) {
			camStream = await navigator.mediaDevices.getUserMedia({
				video: true,
				audio: false
			})
		}

		video = document.querySelector('#chatbox-video')

		if (typeof video.srcObject !== 'undefined') {
			video.srcObject = camStream
		}

		video.play()
	}

	function takePhoto() {
		if (camStream) {
			setPhotoTaken(video)
		}
	}

	function handleClearPhoto() {
		setPhotoTaken(null)
	}

	async function handleConfirmPhoto() {
		try {
			if(!photoTakenBlob) {
				return
			}

			setIsUploading(true)
			
			const photoURL = await storage.store(photoTakenBlob, '.png')

			addMessage({
				sender: me,
				media: photoURL,
				type: 'image',
				sent_at: new Date()
			})

			setPhotoTaken(null)
			setPhotoTakenBlob(null)
			setIsCameraOpen(false)

			onConfirmPhoto()
		} catch(e) {
			alert('Ocorreu um erro ao enviar a imagem.')
			console.log(e)
		} finally {
			setIsUploading(false)
		}
	}

	useEffect(() => {
		if(isCameraOpen) {
			setupCamera()
		}
	}, [isCameraOpen])

	useEffect(() => {
		const canvas = document.querySelector('#chatbox-camera-preview')

		if(photoTaken) {
			const ctx = canvas.getContext('2d')

			ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

			canvas?.classList.remove('hidden')

			canvas.toBlob(setPhotoTakenBlob, 'image/png')
		} else {
			canvas?.classList.add('hidden')
		}
	}, [photoTaken])

	return (
		<>
			<div className={`
				camera-menu bg-slate-700 w-fit h-fit absolute bottom-9 right-0 mx-4 mb-2 z-50 rounded-md py-3 px-2 flex justify-between shadow-lg 
				animate__animated animate__faster
			`}>
				<div className="cursor-pointer flex flex-col items-center hover:bg-slate-600 py-2 px-2 rounded-md w-20">
					<div className="text-3xl">
						<ion-icon name="image-outline"></ion-icon>
					</div>
					<span className="text-[0.7rem]">Galeria</span>
				</div>

				<div 
					className="cursor-pointer flex flex-col items-center hover:bg-slate-600 py-2 px-2 rounded-md w-20" 
					onClick={() => { setIsCameraOpen(true) }}
				>
					<div className="text-3xl">
						<ion-icon name="camera-outline"></ion-icon>
					</div>
					<span className="text-[0.7rem]">Tirar foto</span>
				</div>

				<div className="cursor-pointer flex flex-col items-center hover:bg-slate-600 py-2 px-2 rounded-md w-20">
					<div className="text-3xl">
						<ion-icon name="videocam-outline"></ion-icon>
					</div>
					<span className="text-[0.7rem]">Gravar vídeo</span>
				</div>
			</div>

			<div className={`
				camera-overlay bg-slate-800/80 w-full h-full absolute top-0 left-0 z-50 p-4 flex flex-col gap-4 
				${isCameraOpen ? '' : 'hidden'}`}
			>
				<div 
					className="self-end hover:bg-slate-700 cursor-pointer p-2 pb-0 h-fit rounded-md text-3xl" 
					onClick={() => { setIsCameraOpen(false) }}
				>
					<ion-icon name="close-outline"></ion-icon>
				</div>
				
				<video 
					id="chatbox-video" 
					className={`w-56 h-56 object-cover rounded-full self-center justify-self-center shadow-lg border-2 border-slate-200 ${photoTaken ? 'hidden' : ''}
				`}>
				</video>

				<canvas id="chatbox-camera-preview" className="w-56 h-56 object-cover hidden rounded-full self-center justify-self-center shadow-lg border-2 border-slate-200"></canvas>

				{isUploading ? (
					<div className="w-full flex flex-col items-center">
						<img src="spinner.svg" alt="Aguarde..." className="w-12" />
						<span className="text-sm">Enviando...</span>
					</div>
				) : (
					<div className="grid grid-cols-3 gap-4 items-center justify-center px-4">
						{photoTaken ? (
							<div 
								className="justify-self-center bg-slate-600 cursor-pointer p-2 w-fit rounded-full text-xl flex justify-center items-center border border-slate-300 hover:border-2"
								onClick={handleClearPhoto}
							>
								<ion-icon name="trash-outline"></ion-icon>
							</div>
						) : <div />}

						<div 
							className="bg-slate-600 cursor-pointer p-4 rounded-full text-3xl flex justify-center items-center border border-dashed border-slate-300 hover:border-solid hover:border-2"
							onClick={takePhoto}
						>
							<ion-icon name="camera-outline"></ion-icon>
						</div>

						{photoTaken ? (
							<div 
								className="justify-self-center bg-slate-600 cursor-pointer p-2 w-fit rounded-full text-xl flex justify-center items-center border border-slate-300 hover:border-2"
								onClick={handleConfirmPhoto}
							>
								<ion-icon name="checkmark-outline"></ion-icon>
							</div>
						) : <div />}
					</div>
				)}
			</div>
		</>
	)
}

function Input() {
	const inputRef = useRef()
	const { addMessage, me, him, setAnsweringText } = useContext(GlobalContext)

	const [textContent, setTextContent] = useState('')

	// Audio states
	const [audio, setAudio] = useState(null)
	const [audioBlob, setAudioBlob] = useState(null)
	const [mediaRecorder, setMediaRecorder] = useState(null)
	const [isAudioRecording, setIsAudioRecording] = useState(false)
	const [isAudioPreviewing, setIsAudioPreviewing] = useState(false)
	const [isRecordedAudioPlaying, setIsRecordedAudioPlaying] = useState(false)
	const [recordingDuration, setRecordingDuration] = useState(0)
	const [previewDuration, setPreviewDuration] = useState(0)
	
	// Video states
	const [isCameraMenuOpen, setIsCameraMenuOpen] = useState(false)

	async function handleSend() {
		let content
		let recordingURL

		if(!audioBlob) {
			content = inputRef.current.value
		} else {
			recordingURL = await storage.store(audioBlob, '.mp3')
		}

		addMessage({
			sender: me,
			content,
			media: recordingURL,
			type: audioBlob ? 'audio' : 'text',
			sent_at: new Date()
		})

		setTextContent('')
		setAudio(null)
		setAudioBlob(null)

		// TODO: Temporary
		// simulateAnswer()
	}

	async function checkMicrophonePermissision() {
		if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

			const recorder = new MediaRecorder(stream)

			recorder.ondataavailable = e => {
				recordingChunks.push(e.data)
			}

			recorder.onstop = () => {
				const blob = new Blob(recordingChunks, {
					type: 'audio/mp3; codecs=opus'
				})

				setAudioBlob(blob)

				recordingChunks = []

				const audioURL = window.URL.createObjectURL(blob)

				const audioObj = new Audio(audioURL)

				audioObj.onplay = () => {
					setIsRecordedAudioPlaying(true)
				}

				audioObj.onpause = () => {
					setIsRecordedAudioPlaying(false)
				}

				audioObj.onended = () => {
					setIsRecordedAudioPlaying(false)
				}

				setAudio(audioObj)
			}

			setMediaRecorder(recorder)
		}
	}

	function handleRecordStart() {
		setPreviewDuration(0)
		setRecordingDuration(0)
		setIsAudioRecording(true)

		mediaRecorder.start()
	}

	function handleRecordStop() {
		setIsAudioRecording(false)
		mediaRecorder.stop()
	}

	function handleAttachFile() {
		alert('NÃO IMPLEMENTADO')
	}

	useEffect(() => {
		inputRef.current.addEventListener('keyup', e => {
			if(e.key === 'Enter') {
				handleSend()
			}
		})

		checkMicrophonePermissision()
	}, [inputRef])

	useEffect(() => {
		let recordingInterval

		if(isAudioRecording) {
			recordingInterval = setInterval(() => {
				console.log('recordingDuration', recordingDuration)

				setRecordingDuration(old => old + 1)
			}, 1000)
		}

		return () => {
			clearInterval(recordingInterval)
		}
	}, [isAudioRecording, recordingDuration])

	useEffect(() => {
		let previewInterval

		if(isAudioPreviewing) {
			previewInterval = setInterval(() => {
				console.log('previewDuration', previewDuration)

				setPreviewDuration(old => old + 1)
			}, 1000)
		}

		return () => {
			clearInterval(previewInterval)
		}
	}, [isAudioPreviewing, previewDuration])

	useEffect(() => {
		if(!isRecordedAudioPlaying) {
			setPreviewDuration(0)
			setIsAudioPreviewing(false)
		}
	}, [isRecordedAudioPlaying])

	// TODO: Temporary
	function simulateAnswer() {
		setTimeout(() => {
			setAnsweringText('digitando...')
		}, 1000)

		setTimeout(() => {
			setAnsweringText(null)

			addMessage({
				sender: him,
				content: 'Auto answer with link: mylink.com/test'
			})

			setTimeout(() => {
				addMessage({
					sender: him,
					media: 'test/avatar2.jpeg',
					type: 'image',
					content: 'Olá só essa foto!'
				})
			}, 1000)

			setTimeout(() => {
				addMessage({
					sender: him,
					media: 'test/video.mp4',
					type: 'video',
					content: 'Assiste aí!'
				})
			}, 1500)

			setTimeout(() => {
				addMessage({
					sender: him,
					media: 'notification.ogg',
					type: 'audio'
				})
			}, 2000)
		}, 1500)
	}

	function getEnableActions() {
		return textContent || audio ? [
			{
				icon: 'send-outline',
				function: handleSend
			}
		] : [
			{
				icon: 'attach-outline',
				function: handleAttachFile,
				disabled: isAudioRecording || isCameraMenuOpen
			}
		]
	}

	function toggleStartStop() {
		if(isRecordedAudioPlaying) {
			audio.pause()
			setIsAudioPreviewing(false)
		} else {
			audio.play()
			setPreviewDuration(0)
			setIsAudioPreviewing(true)
		}
	}

	const actions = getEnableActions()
	const isRecordingEnable = !textContent
	const formattedAudioDuration = format(addSeconds(startOfDay(new Date()), recordingDuration), 'mm:ss')
	const formattedAudioPreviewDuration = format(addSeconds(startOfDay(new Date()), previewDuration), 'mm:ss')
	const previewDurationPercentage = previewDuration * 100 / recordingDuration
	const isTextInputVisible = !isAudioRecording && !audio
	const isCameraVisible = !isAudioRecording && !audio
	const isAudioInputVisible = isAudioRecording || audio
	const isAudioOptionsVisible = audio

	return (
		<>
			{isCameraMenuOpen && <Camera onConfirmPhoto={() => { setIsCameraMenuOpen(false) }} />}

			<div id="chatbox-input" className="h-10 flex justify-between items-center bg-slate-100 dark:bg-slate-700 pr-2 z-20 shadow-lg">
				{isTextInputVisible && (
					<input 
						type="text" 
						ref={inputRef}
						className="h-full bg-transparent w-full outline-none px-3 flex items-center text-sm text-slate-600 dark:text-slate-200" 
						onChange={e => {
							setTextContent(e.target.value)
						}}
						value={textContent}
						disabled={isAudioRecording}
					/>
				)}

				{isCameraVisible && (
					<div 
						className="my-2 opacity-60 hover:opacity-100 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md p-1 flex items-center transition-colors text-2xl cursor-pointer"
						onClick={() => { setIsCameraMenuOpen(old => !old) }}
					>
						<ion-icon name="camera-outline"></ion-icon>
					</div>
				)}

				{isAudioInputVisible && (
					<div className="flex flex-col w-full pl-2">
						<div className={`flex justify-between text-xs mt-2 opacity-60 p-0.5 ${isAudioPreviewing ? '' : 'mb-2'}`}>
							{previewDuration > 0 ? (
								<div className="flex items-center">
									{formattedAudioPreviewDuration}
								</div>
							) : <div />}

							{recordingDuration > 0 && (
								<div className="flex items-center">
									{formattedAudioDuration}
								</div>
							)}
						</div>

						{isAudioPreviewing && (
							<div className="audio-preview-progress border border-slate-500 rounded-sm h-1 w-full">
								<div className={`relative transition-all w-[${previewDurationPercentage}%] bg-sky-500 h-1`}></div>
							</div>
						)}
					</div>
				)}

				{isAudioOptionsVisible && (
					<>
						<div 
							className="my-2 opacity-60 hover:opacity-100 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md p-1 flex items-center transition-colors text-xl cursor-pointer"
							onClick={toggleStartStop}
						>
							<ion-icon name={isRecordedAudioPlaying ? 'stop-outline' : 'play-outline'}></ion-icon>
						</div>

						<div 
							className="my-2 opacity-60 hover:opacity-100 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md p-1 flex items-center transition-colors text-xl cursor-pointer"
							onClick={() => { 
								setAudio(null) 
							}}
						>
							<ion-icon name="trash-outline"></ion-icon>
						</div>
					</>
				)}

				{isRecordingEnable && (
					<div 
						className={`
							my-2 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md p-1 flex items-center transition-colors text-2xl
							${isCameraMenuOpen ? 'cursor-not-allowed opacity-20' : 'cursor-pointer opacity-60 hover:opacity-100'}
						`}
						onClick={isAudioRecording ? handleRecordStop : handleRecordStart}
					>
						<ion-icon name={isAudioRecording ? 'stop-outline' : 'mic-outline'}></ion-icon>
					</div>
				)}

				{actions.map(action => (
					<div 
						key={action.icon}
						className={`
							my-2 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md p-1 flex items-center transition-colors
							${textContent ? 'text-xl' : 'text-2xl'}
							${action.disabled ? 'cursor-not-allowed opacity-20' : 'cursor-pointer opacity-60 hover:opacity-100'}
						`}
						onClick={action.function}
					>
						<ion-icon name={action.icon}></ion-icon>
					</div>
				))}
			</div>
		</>
	)
}

function Menu() {
	const { position, isSoundEnable, setPosition, setIsSoundEnable, isMenuVisible } = useContext(GlobalContext)

	if(!isMenuVisible) {
		return null
	}

	return (
		<div className="bg-slate-200 dark:bg-slate-700 ring-1 ring-slate-300 dark:ring-slate-600 w-[100px] absolute top-10 right-3 z-30 shadow-lg rounded-md p-2">
			<ul>
				<li className="flex flex-col">
					<span className="text-[10px] text-slate-500 dark:text-slate-300 mx-1">Posição do chat</span>

					<div className="text-lg flex gap-1">
						<div 
							className={`hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md w-fit p-1 flex justify-center items-center cursor-pointer ${position === 'bottom-left' ? 'border border-slate-400' : ''}`}
							onClick={() => {
								setPosition('bottom-left')
							}}
						>
							<ion-icon src="https://unpkg.com/lucide-static@0.381.0/icons/move-down-left.svg"></ion-icon>
						</div>
						<div 
							className={`hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md w-fit p-1 flex justify-center items-center cursor-pointer ${position === 'center' ? 'border border-slate-400' : ''}`}
							onClick={() => {
								setPosition('center')
							}}
						>
							<ion-icon src="https://unpkg.com/lucide-static@0.381.0/icons/shrink.svg"></ion-icon>
						</div>
						<div 
							className={`hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md w-fit p-1 flex justify-center items-center cursor-pointer ${position === 'bottom-right' ? 'border border-slate-400' : ''}`}
							onClick={() => {
								setPosition('bottom-right')
							}}
						>
							<ion-icon src="https://unpkg.com/lucide-static@0.381.0/icons/move-down-right.svg"></ion-icon>
						</div>
					</div>
				</li>

				<li className="flex flex-col">
					<span className="text-[10px] text-slate-500 dark:text-slate-300 mx-1">Controle de sons</span>

					<div className="text-lg flex gap-1">
						<div 
							className={`hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md w-fit p-1 flex justify-center items-center cursor-pointer ${isSoundEnable ? '' : 'border border-slate-400'}`}
							onClick={() => {
								setIsSoundEnable(false)
							}}
						>
							<ion-icon name="volume-mute-outline"></ion-icon>
						</div>
						<div 
							className={`hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md w-fit p-1 flex justify-center items-center cursor-pointer ${isSoundEnable ? 'border border-slate-400' : ''}`}
							onClick={() => {
								setIsSoundEnable(true)
							}}
						>
							<ion-icon name="volume-high-outline"></ion-icon>
						</div>
					</div>
				</li>
			</ul>
		</div>
	)
}

function Modal() {
	const { mediaDetail, setMediaDetail } = useContext(GlobalContext)

	function handleClose() {
		const modalWindow = document.querySelector('.chatbox-window')
		const modalOverlay = document.querySelector('.chatbox-overlay')

		modalWindow.classList.replace('animate__zoomIn', 'animate__zoomOut')
		modalOverlay.classList.add('fade-out')
		
		setTimeout(() => {
			setMediaDetail(false)

			modalOverlay.classList.remove('fade-out')
		}, 600)
	}

	useEffect(() => {
		function keyup(e) {
			if(e.key === 'Escape') {
				handleClose()
			}
		}
		
		document.addEventListener('keyup', keyup)

		return () => {
			document.removeEventListener('keyup', keyup)
		}
	}, [])

	if(!mediaDetail) {
		return null
	}

	function printContent() {
		switch(mediaDetail.type) {
			case 'video':
				return (
					<div className="h-full flex justify-center">
						<video controls autoPlay src={mediaDetail.media} className="w-full object-contain rounded-md"></video>
					</div>
				)
			case 'image':
				return (
					<div className="h-full flex justify-center">
						<img src={mediaDetail.media} className="w-full object-contain" />
					</div>
				)
			default: 
				handleClose()
				break
		}
	}

	return (
		<div className="chatbox-overlay fixed top-0 left-0 w-screen h-screen bg-gray-800/70 z-50 flex items-center justify-center">
			<div className="chatbox-window bg-slate-200 dark:bg-slate-700 w-fit max-w-[80%] h-fit max-h-[80%] rounded-md animate__animated animate__zoomIn animate__faster flex flex-col p-3">
				<div className="hover:bg-slate-300 dark:hover:bg-slate-600 cursor-pointer p-1 flex justify-center items-center rounded-md self-end text-slate-600 dark:text-slate-400" onClick={handleClose}>
					<ion-icon name="close-outline" size="large"></ion-icon>
				</div>

				<div className="overflow-y-auto p-2 pb-4">
					{printContent()}
				</div>
			</div>
		</div>
	)
}

function AudioPlayer({ media, whoami }) {
	const speeds = [1, 2]

	const [audio, setAudio] = useState(null)
	const [isPlaying, setIsPlaying] = useState(false)
	const [audioDuration, setAudioDuration] = useState(Infinity)
	const [audioCurrentTime, setAudioCurrentTime] = useState(0)
	const [speed, setSpeed] = useState(1)

	function togglePlayPause() {
		if(!isPlaying) {
			audio.play()
			setIsPlaying(true)
		} else {
			audio.pause()
			setIsPlaying(false)
		}
	}

	function handleSeek(value) {
		setAudio(old => {
			old.currentTime = value

			return old
		})
		setAudioCurrentTime(value)
	}

	function handleChangeSpeed() {
		if(audio) {
			const currentSpeedIndex = speeds.findIndex(s => s === speed)
			const isFastest = speed === speeds.at(-1)
			const newSpeed = isFastest ? speeds[0] : speeds[currentSpeedIndex + 1]

			setAudio(old => {
				old.playbackRate = newSpeed

				return old
			})

			setSpeed(newSpeed)
		}
	}

	async function loadAudio(url) {
		// const { data } = await axios.get(url, {
		// 	responseType: 'blob'
		// })

		// const audioData = URL.createObjectURL(data)

		// console.log(url)

		const audioObj = new Audio(url)

		audioObj.onloadedmetadata = () => {
			console.log('duration', audioObj.duration)

			setAudioDuration(Math.floor(audioObj.duration))
		}

		audioObj.ontimeupdate = () => {
			setAudioCurrentTime(Math.floor(audioObj.currentTime))
		}

		audioObj.onended = () => {
			setIsPlaying(false)
			handleSeek(0)
		}

		audioObj.load()

		setAudio(audioObj)
	}

	useEffect(() => {
		if(!audio) {
			console.log('media', media)

			loadAudio(media)
		}
	}, [audio])

	if(!audio) { // audioDuration === Infinity
		return null
	}

	const formattedCurrentTime = format(new Date(audioCurrentTime * 1000), 'mm:ss')
	const formattedTotalDuration = audioDuration !== Infinity ? format(new Date(audioDuration * 1000), 'mm:ss') : ''

	return (
		<div className="audio-player flex flex-col">
			<div className="flex gap-1">
				<div 
					onClick={togglePlayPause} 
					className={`
						p-1 rounded-md flex justify-center items-center text-2xl 
						${whoami === 'me' ? 'dark:hover:bg-slate-700 hover:bg-slate-200' : 'hover:bg-slate-200'}
					`}
				>
					{isPlaying ? (
						<ion-icon name="pause-outline"></ion-icon>
					) : (
						<ion-icon name="play"></ion-icon>
					)}
				</div>
				
				<input 
					type="range" 
					step={1} 
					min={0} 
					max={audioDuration} 
					value={audioCurrentTime} 
					onChange={e => {
						handleSeek(e.target.value)
					}}
					className="w-full"
				/>

				<span 
					className="px-1 rounded-md text-sm text-slate-400 select-none hover:bg-slate-200 flex justify-center items-center" 
					onClick={handleChangeSpeed}
				>
					{speed}x
				</span>
			</div>

			<div className="flex justify-between w-full">
				<span className="text-[10px] text-slate-400">{formattedCurrentTime}</span>
				<span className="text-[10px] text-slate-400">{formattedTotalDuration}</span>
			</div>
		</div>
	)
}

function ChatContainer() {
	const { messages, me, answeringText, isMinimized, position } = useContext(GlobalContext)

	useEffect(() => {
		if(!isMinimized) {
			tippy('[data-tippy-content]', {
				delay: [400, 0],
				followCursor: true,
				size: 'small',
				theme: 'translucent'
			})
		}
	}, [isMinimized])

	let positionClasses

	switch(position) {
		case 'bottom-left': 
			positionClasses = 'bottom-0 left-4'
			break
		case 'center': 
			positionClasses = 'rounded-md top-[50%] -translate-y-1/2 left-[50%] -translate-x-1/2'
			break
		default: 
			positionClasses = 'bottom-0 right-4'
			break
	}

	return (
		<>
			<div 
				id="chatbox-container" 
				className={`
					fixed w-[300px] bg-slate-200 dark:bg-slate-800 rounded-t-md shadow-lg z-50 flex flex-col overflow-hidden transition-all 
					${isMinimized ? 'h-11' : 'h-[420px]'}
					${positionClasses}
				`}
			>
				<Header />

				{!isMinimized && (
					<>
						<div 
							id="messages-container" 
							className="bg-transparent flex-1 w-full h-[90%] flex flex-col gap-2 py-3 px-2 overflow-x-hidden overflow-y-auto z-10"
						>
							{messages.map(message => (
								<Message 
									key={message.id} 
									sender={message.sender} 
									content={message.content} 
									type={message.type}
									media={message.media}
									whoami={message.sender.id === me.id ? 'me' : 'him'}
									sent_at={message.sent_at}
								/>
							))}

							{answeringText && (
								<div className="text-slate-400 dark:text-slate-500 text-xs px-1 animate__animated animate__fadeIn animate__faster">{answeringText}</div>
							)}
						</div>
						
						<Input />
					</>
				)}
			</div>

			<Modal />
		</>
	)
}

const App = () => {
	return (
		<GlobalProvider>
			<ChatContainer />
		</GlobalProvider>
	)
}

ReactDOM.render(<App />, document.getElementById('chatbox'))
