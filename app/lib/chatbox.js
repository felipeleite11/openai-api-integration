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

	ERROS
	- O menu não consegue reativar os sons de alerta
*/

const { createContext, useState, useContext, useEffect, useRef } = React
const { format } = dateFns

const animations = {
	balloonIn: 'animate__animated animate__bounceIn',
	avatarIn: 'animate__animated animate__bounceIn'
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
		{
			id: 1,
			sender: participants[0],
			content: 'Olá, sou Felipe!',
			sent_at: new Date('2024-05-30 08:00:00'),
			type: 'text'
		},
		{
			id: 2,
			sender: participants[1],
			content: 'Auto answer with link: https://chatgpt.com/c/f98c122e-437c-43ab-b316-d5c3d5c8bdc2',
			sent_at: new Date('2024-05-30 08:02:00'),
			type: 'text'
		},
		{
			id: 3,
			sender: participants[1],
			media: 'https://img.freepik.com/fotos-gratis/rvore-de-notas-de-dolar-crescendo-em-um-vaso-branco_35913-3163.jpg',
			sent_at: new Date('2024-05-30 08:05:00'),
			type: 'image',
			content: 'Esta é minha imagem'
		},
		{
			id: 4,
			sender: participants[1],
			media: 'test/video.mp4', //'https://integrare-os-minio.nyr4mj.easypanel.host/integrare-os/video.mp4',
			sent_at: new Date('2024-05-30 08:07:00'),
			type: 'video',
			content: 'Este é meu vídeo'
		},
		{
			id: 5,
			sender: participants[1],
			media: 'test/audio.mp3', //'https://integrare-os-minio.nyr4mj.easypanel.host/integrare-os/dev/audio.mp3',
			sent_at: new Date('2024-05-30 08:10:00'),
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

	function addMessage({ sender, content, media, type = 'text' }) {
		setMessages(old => [...old, {
			id: old.length + 1,
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
	}

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
		<div className="chatbox-header bg-slate-100 dark:bg-slate-700 h-11 flex justify-between items-center pl-3 pr-2 text-sm text-slate-600 dark:text-slate-200 rounded-t-md z-20">
			<div 
				className="flex gap-3 items-center"
				onMouseEnter={() => {
					setIsMenuVisible(false)
				}}
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
					<AudioPlayer audio={media} />
					
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
				chatbox-balloon text-sm rounded-md p-2 pb-1 shadow-md w-[80%] flex flex-col gap-1
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

function Input() {
	const inputRef = useRef()
	const { addMessage, me, him, setAnsweringText } = useContext(GlobalContext)

	function handleSend() {
		const content = inputRef.current.value

		if(!content) {
			return
		}

		addMessage({
			sender: me,
			content
		})

		inputRef.current.value = ''

		// TODO: Temporary
		simulateAnswer()
	}

	useEffect(() => {
		inputRef.current.addEventListener('keyup', e => {
			if(e.key === 'Enter') {
				handleSend()
			}
		})
	}, [])

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

	return (
		<div className="chatbox-input h-10 flex justify-between items-center bg-slate-100 dark:bg-slate-700 pr-2 z-20">
			<input type="text" ref={inputRef} className="h-full bg-transparent w-full outline-none px-3 flex items-center text-sm text-slate-600 dark:text-slate-200" />

			<div 
				className="opacity-60 hover:opacity-100 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md p-2 pr-1 cursor-pointer flex items-center text-slate-700 dark:text-slate-200 transition-colors" 
				onClick={handleSend}
			>
				<ion-icon name="send-outline" size="small"></ion-icon>
			</div>
		</div>
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
	const { mediaDetail, setMediaDetail, setIsMenuVisible } = useContext(GlobalContext)

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

function AudioPlayer({ audio: media }) {
	const speeds = [1, 2]

	const [audio, setAudio] = useState(null)
	const [isPlaying, setIsPlaying] = useState(false)
	const [audioDuration, setAudioDuration] = useState(0)
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

	useEffect(() => {
		if(!audio) {
			const audioObj = new Audio(media)

			audioObj.onloadedmetadata = () => {
				setAudioDuration(Math.floor(audioObj.duration))
			}

			audioObj.ontimeupdate = () => {
				setAudioCurrentTime(Math.floor(audioObj.currentTime))
			}

			audioObj.onended = () => {
				setIsPlaying(false)
				handleSeek(0)
			}

			setAudio(audioObj)
		}
	}, [audio])

	if(!audio) {
		return null
	}

	const formattedCurrentTime = format(new Date(audioCurrentTime * 1000), 'mm:ss')
	const formattedTotalDuration = format(new Date(audioDuration * 1000), 'mm:ss')

	return (
		<div className="audio-player flex flex-col">
			<div className="flex gap-1">
				<div onClick={togglePlayPause} className="p-1 rounded-md hover:bg-slate-200 flex justify-center items-center text-2xl">
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
			<div className={`
				chatbox-container fixed w-[300px] bg-slate-200 dark:bg-slate-800 rounded-t-md shadow-lg z-50 flex flex-col overflow-hidden transition-all 
				${isMinimized ? 'h-11' : 'h-[420px]'}
				${positionClasses}
			`}>
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
