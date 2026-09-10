/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CountryPicker, COUNTRY_OPTIONS } from './countries';

afterEach(() => { document.body.innerHTML = ''; });

describe('CountryPicker', () => {
  it('exibe o país selecionado e mantém o código ISO em campo oculto', () => {
    render(<CountryPicker value="BR" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toHaveValue('Brasil');
    expect(screen.getByDisplayValue('BR')).toHaveAttribute('name', 'countryCode');
    expect(COUNTRY_OPTIONS.length).toBeGreaterThan(200);
  });

  it('pesquisa por nome ou código sem depender de rede', () => {
    const onChange = vi.fn(); render(<CountryPicker value="" onChange={onChange} />);
    const input = screen.getByRole('combobox'); fireEvent.focus(input); fireEvent.change(input, { target: { value: 'br' } });
    fireEvent.click(screen.getByRole('option', { name: /Brasil/ }));
    expect(onChange).toHaveBeenCalledWith('BR');
  });
});
