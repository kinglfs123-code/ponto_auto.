import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Ponto_auto."

interface HoleriteEnviadoProps {
  nomeCompleto?: string
  mesReferencia?: string
  empresaNome?: string
  downloadUrl?: string
}

const HoleriteEnviadoEmail = ({
  nomeCompleto,
  mesReferencia,
  empresaNome,
  downloadUrl,
}: HoleriteEnviadoProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu holerite de {mesReferencia || 'referência'} está disponível</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Holerite — {mesReferencia || 'Mês'}</Heading>
        <Text style={text}>
          Olá{nomeCompleto ? ` ${nomeCompleto}` : ''},
        </Text>
        <Text style={text}>
          Seu holerite referente ao mês <strong>{mesReferencia || '—'}</strong> está disponível para download.
        </Text>
        {downloadUrl && (
          <Section style={{ textAlign: 'center' as const, margin: '28px 0' }}>
            <Button style={button} href={downloadUrl}>
              Baixar Holerite (PDF)
            </Button>
          </Section>
        )}
        <Text style={smallText}>
          Este link é válido por 1 hora. Após expirar, solicite um novo envio.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          {empresaNome || SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: HoleriteEnviadoEmail,
  subject: (data: Record<string, any>) => `Holerite — ${data.mesReferencia || 'Mês'}`,
  displayName: 'Holerite enviado',
  previewData: {
    nomeCompleto: 'Joana Dark',
    mesReferencia: '2026-04',
    empresaNome: 'Empório do Pão',
    downloadUrl: 'https://example.com/download',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a2e', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#333', lineHeight: '1.6', margin: '0 0 16px' }
const smallText = { fontSize: '13px', color: '#888', lineHeight: '1.5', margin: '0 0 16px' }
const button = {
  backgroundColor: '#6366f1',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '6px',
  fontWeight: 'bold' as const,
  fontSize: '15px',
  textDecoration: 'none',
}
const hr = { border: 'none', borderTop: '1px solid #eee', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999', margin: '0' }
