import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cep: string }> }
) {
  try {
    const { cep } = await params
    const clean = cep.replace(/\D/g, '')

    if (clean.length !== 8) {
      return NextResponse.json({ error: 'CEP inválido.' }, { status: 400 })
    }

    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
    const data = await res.json()

    if (data.erro) {
      return NextResponse.json({ error: 'CEP não encontrado.' }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        zip_code:     clean,
        street:       data.logradouro,
        neighborhood: data.bairro,
        city:         data.localidade,
        state:        data.uf,
      },
    })
  } catch (error) {
    console.error('[cep:get]', error)
    return NextResponse.json(
      { error: 'Erro ao buscar CEP.' },
      { status: 500 }
    )
  }
}