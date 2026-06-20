import { findAvatarOption } from '../data/avatarOptions'
import type { User } from '../types'
import type { UserTotals } from './stats'
import { avatarSvgDataUrl } from './avatarSvg'
import { APP_NAME } from '../config/appBrand'

function roundedRectPath(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const safeRadius = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + safeRadius, y)
  context.lineTo(x + width - safeRadius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius)
  context.lineTo(x + width, y + height - safeRadius)
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height)
  context.lineTo(x + safeRadius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius)
  context.lineTo(x, y + safeRadius)
  context.quadraticCurveTo(x, y, x + safeRadius, y)
  context.closePath()
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  roundedRectPath(context, x, y, width, height, radius); context.fill()
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('No pudimos preparar el avatar.')); image.src = source })
}

export async function createProfileCardPng(user: User, totals: UserTotals): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = 1080; canvas.height = 1350
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Tu navegador no permite generar la tarjeta.')

  const gradient = context.createLinearGradient(0, 0, 1080, 1350)
  gradient.addColorStop(0, '#07110e'); gradient.addColorStop(.55, '#0d2b21'); gradient.addColorStop(1, '#064e3b')
  context.fillStyle = gradient; context.fillRect(0, 0, 1080, 1350)
  context.fillStyle = 'rgba(52,211,153,.12)'; context.beginPath(); context.arc(930, 120, 300, 0, Math.PI * 2); context.fill()
  context.fillStyle = '#34d399'; context.font = '900 58px Inter, Arial, sans-serif'; context.fillText(APP_NAME.toUpperCase(), 80, 105)
  context.fillStyle = '#94a3b8'; context.font = '600 28px Inter, Arial, sans-serif'; context.fillText('MI TARJETA DE JUGADOR', 80, 150)

  const avatarOption = findAvatarOption(user.avatar)
  if (avatarOption) {
    const image = await loadImage(avatarSvgDataUrl(avatarOption))
    context.save(); roundedRectPath(context, 390, 220, 300, 300, 64); context.clip(); context.drawImage(image, 390, 220, 300, 300); context.restore()
  } else {
    context.fillStyle = '#34d399'; roundedRect(context, 390, 220, 300, 300, 64)
    const fallbackAvatar = user.avatar?.startsWith('avatar:') ? user.initials : user.avatar || user.initials
    context.fillStyle = '#07110e'; context.font = '900 104px Inter, Arial, sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(fallbackAvatar, 540, 370); context.textAlign = 'left'; context.textBaseline = 'alphabetic'
  }

  context.textAlign = 'center'; context.fillStyle = '#f8fafc'; context.font = '900 58px Inter, Arial, sans-serif'; context.fillText(user.name, 540, 610, 900)
  const handle = user.username.replace(/^@/, '').trim()
  if (handle) { context.fillStyle = '#34d399'; context.font = '700 30px Inter, Arial, sans-serif'; context.fillText(`@${handle}`, 540, 658) }
  if (user.position) { context.fillStyle = '#cbd5e1'; context.font = '600 28px Inter, Arial, sans-serif'; context.fillText(user.position, 540, 704) }

  const stats = [{ label: 'GOLES', value: totals.goals }, { label: 'ASISTENCIAS', value: totals.assists }, { label: 'PARTIDOS', value: totals.matches }]
  stats.forEach((stat, index) => {
    const x = 75 + index * 325
    context.fillStyle = 'rgba(255,255,255,.08)'; roundedRect(context, x, 785, 280, 230, 36)
    context.textAlign = 'center'; context.fillStyle = '#f8fafc'; context.font = '900 76px Inter, Arial, sans-serif'; context.fillText(String(stat.value), x + 140, 900)
    context.fillStyle = '#94a3b8'; context.font = '800 22px Inter, Arial, sans-serif'; context.fillText(stat.label, x + 140, 956)
  })
  context.fillStyle = 'rgba(52,211,153,.12)'; roundedRect(context, 75, 1065, 930, 120, 30)
  context.fillStyle = '#34d399'; context.font = '800 28px Inter, Arial, sans-serif'; context.textAlign = 'center'; context.fillText(`${totals.wins} victorias · ${totals.winRate}% de efectividad`, 540, 1137)
  context.fillStyle = '#94a3b8'; context.font = '600 22px Inter, Arial, sans-serif'; context.fillText('Tu fútbol, en números.', 540, 1270)

  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No pudimos crear el PNG.')), 'image/png', 1))
}
