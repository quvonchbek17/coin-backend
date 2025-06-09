import { registerAs } from '@nestjs/config'

interface MinioConfigOptions {
	host: string
	accessKey: string
	secretKey: string
	bucket: string
	port: number
}

export const minioConfig = registerAs(
	'minio',
	(): MinioConfigOptions => ({
		host: process.env.MINIO_SERVICE_HOST,
		accessKey: process.env.MINIO_SERVICE_ACCESSKEY,
		secretKey: process.env.MINIO_SERVICE_SECRETKEY,
		port: Number(process.env.MINIO_SERVICE_PORT),
		bucket: process.env.MINIO_SERVICE_BUCKET,
	}),
)
