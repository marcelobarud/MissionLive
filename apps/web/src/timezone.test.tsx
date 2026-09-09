/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TIMEZONE_OPTIONS, TimezonePicker } from './timezone';

afterEach(() => { document.body.innerHTML = ''; });

describe('TimezonePicker', () => {
  it('exibe o timezone atual com label amigável e persiste o ID IANA', () => {
    const onChange = vi.fn();
    render(<TimezonePicker value="America/Sao_Paulo" onChange={onChange} />);
    expect(screen.getByRole('combobox')).toHaveValue('Brasília — UTC−03:00');
    expect(screen.getByDisplayValue('America/Sao_Paulo')).toHaveAttribute('name', 'timezone');
    expect(TIMEZONE_OPTIONS.length).toBeGreaterThan(10);
  });

  it('pesquisa por cidade, acento removido e identificador IANA sem rede', () => {
    const onChange = vi.fn();
    render(<TimezonePicker value="America/Sao_Paulo" onChange={onChange} />);
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'sao' } });
    expect(screen.getByRole('option', { name: /Brasília/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: /Brasília/ }));
    expect(onChange).toHaveBeenCalledWith('America/Sao_Paulo');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'America/New_York' } });
    expect(screen.getByRole('option', { name: /Nova York/ })).toBeInTheDocument();
  });

  it('suporta teclado e informa quando não há resultados', () => {
    const onChange = vi.fn();
    render(<TimezonePicker value="America/Sao_Paulo" onChange={onChange} />);
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Tokyo' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('Asia/Tokyo');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'zzzzzz' } });
    expect(screen.getByText('Nenhum fuso encontrado.')).toBeInTheDocument();
  });
});
