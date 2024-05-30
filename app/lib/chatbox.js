/*
	IDEIAS
	- Minimizar chat
	- Emitir sons de alerta
	- Permitir mutar os sons
	- Tratar links
	- permitir mídias (imagens, vídeos, áudios)
	- Permitir ampliar imagens e vídeos em um modal
	- Permitir copiar mensagem ao clicar em um balloon
	- Exportar conversa para texto único (ccopiar para área de transferência)
*/

const { createContext, useState, useContext, useEffect, useRef } = React
const { format } = dateFns

const animations = {
	balloonIn: 'animate__animated animate__bounceIn',
	avatarIn: 'animate__animated animate__bounceIn'
}

const GlobalContext = createContext()

function GlobalProvider({ children }) {
	const [title, setTitle] = useState('Syndi chat')
	const [me, setMe] = useState({
		id: 1,
		name: 'Felipe',
		avatar: 'https://github.com/felipeleite11.png'
	})
	const [him, setHim] = useState({
		id: 2,
		name: 'Diego',
		avatar: 'https://github.com/diego3g.png',
		isOnline: true
	})
	const [participants, setParticipants] = useState([
		{
			id: 1,
			name: 'Felipe',
			avatar: 'https://github.com/felipeleite11.png'
		},
		{
			id: 2,
			name: 'Diego',
			avatar: 'https://github.com/diego3g.png'
		}
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
			content: 'Olá, sou Diego!',
			sent_at: new Date('2024-05-30 08:01:00'),
			type: 'text'
		}
	])
	const [answeringText, setAnsweringText] = useState(null)

	function addMessage({ sender, content, type = 'text' }) {
		setMessages(old => [...old, {
			id: old.length + 1,
			sender,
			content,
			type,
			sent_at: new Date()
		}])

		setTimeout(() => {
			const container = document.querySelector('#messages-container')

			container.scrollTop = container.scrollHeight
		}, 200)
	}

	return (
		<GlobalContext.Provider value={{
			title,
			participants,
			me,
			him,
			messages,
			answeringText,

			setAnsweringText,

			addMessage
		}}>
			{children}
		</GlobalContext.Provider>
	)
}

function Header() {
	const { title, him } = useContext(GlobalContext)

	return (
		<div className="chatbox-header bg-slate-700 h-11 flex justify-between items-center pl-3 pr-2 text-sm text-slate-200 rounded-t-md z-20">
			<div className="flex gap-3 items-center">
				<img src={him.avatar} alt={him.name} className={`h-8 w-8 rounded-full ${him.isOnline ? 'border-2 border-emerald-500' : ''}`} />
				{title}
			</div>

			<div className="hover:bg-slate-600 rounded-md p-1 cursor-pointer flex justify-center items-center">
				<ion-icon name="remove-outline" size="small"></ion-icon>
			</div>
		</div>
	)
}

function Balloon({ participant, content, whoami, sent_at, type }) {
	function printContent() {
		switch(type) {
			case 'image': return (
				<a href={content} target="_blank" className="hover:opacity-80">
					<img src={content} className="w-full object-cover rounded-md"  />
				</a>
			)
			default: return content
		}
	}

	return (
		<div className={`
			chatbox-balloon text-sm rounded-md p-2 pb-1 shadow-md w-[80%] flex flex-col gap-1
			${whoami === 'me' ? 'bg-slate-600 self-end' : 'bg-slate-100 text-slate-800 self-start'}
			${animations.balloonIn}
		`}>
			<span className="text-xs font-semibold opacity-90">{participant.name}</span>
			{printContent()}
			<span className="text-[0.6rem] self-end opacity-50">{format(sent_at, 'HH:mm')}</span>
		</div>
	)
}

function Message({ sender, content, whoami, sent_at, type }) {
	return (
		<div className="chatbox-message flex gap-3">
			{whoami === 'him' && (
				<img src={sender.avatar} alt={sender.name} className={`h-8 w-8 rounded-full shadow-md ${animations.avatarIn}`} />
			)}
			
			<Balloon 
				participant={sender} 
				content={content}
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

	useEffect(() => {
		function handleSend(e) {
			if(e.key === 'Enter') {
				addMessage({
					sender: me,
					content: e.target.value
				})

				inputRef.current.value = ''

				// TODO: Temporary
				simulateAnswer()
			}
		}

		inputRef.current.addEventListener('keyup', handleSend)

		return () => {
			inputRef.current.removeEventListener('keyup', handleSend)
		}
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
				content: 'Auto answer...'
			})

			setTimeout(() => {
				addMessage({
					sender: him,
					content: 'https://img.freepik.com/fotos-gratis/rvore-de-notas-de-dolar-crescendo-em-um-vaso-branco_35913-3163.jpg',
					type: 'image'
				})
			}, 1000)
		}, 2500)
	}

	return (
		<div className="chatbox-input h-10 flex justify-between items-center bg-slate-700 pr-2 z-20">
			<input type="text" ref={inputRef} className="h-full bg-transparent w-full outline-none px-3 flex items-center text-sm text-slate-200" />

			<div className="opacity-60 hover:opacity-100 hover:bg-slate-600 rounded-md p-2 pr-1 cursor-pointer flex items-center">
				<ion-icon name="send-outline" size="small"></ion-icon>
			</div>
		</div>
	)
}

function ChatContainer() {
	const { messages, me, answeringText } = useContext(GlobalContext)

	return (
		<div className="fixed bottom-0 right-4 w-[300px] h-[420px] bg-slate-800 rounded-t-md shadow-lg z-50 flex flex-col overflow-hidden">
			<Header />

			<div id="messages-container" className="bg-transparent flex-1 w-full h-[90%] flex flex-col gap-2 py-3 px-2 overflow-x-hidden overflow-y-auto z-10">
				{messages.map(message => (
					<Message 
						key={message.id} 
						sender={message.sender} 
						content={message.content} 
						whoami={message.sender.id === me.id ? 'me' : 'him'}
						sent_at={message.sent_at}
						type={message.type}
					/>
				))}

				{answeringText && (
					<div className="text-slate-500 text-xs px-1 animate__animated animate__fadeIn animate__faster">{answeringText}</div>
				)}
			</div>

			<Input />
		</div>
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
