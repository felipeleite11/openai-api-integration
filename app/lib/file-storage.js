async function uploadToChatFileStorage(blob) {
	if (!blob) {
		alert('Nenhum arquivo enviado.')
		return
	}

	console.log('upload', blob)

	const bucketName = 'integrare-os'
	const objectName = 'audio.ogg'
	const minioEndpoint = 'https://integrare-os-minio.nyr4mj.easypanel.host'
	const accessKey = 'WWjoUzipUHvcTfzQYxK6'
	const secretKey = 'T0Ax4Y48dQwaJECSEkl1NV0dc3oBt6N5zPL2pY8m'

	const url = `${minioEndpoint}/${bucketName}/dev/${objectName}`

	const headers = new Headers()
	headers.append('Authorization', `Basic ${btoa(`${accessKey}:${secretKey}`)}`)
	headers.append('Content-Type', blob.type)

	try {
		const response = await fetch(url, {
			method: 'PUT',
			headers: headers,
			body: blob
		})

		if (response.ok) {
			console.log('Upload ok!')
		} else {
			console.error('Falha no upload!', response.statusText)
		}
	} catch (error) {
		console.error('Erro no upload', error)
	}
}