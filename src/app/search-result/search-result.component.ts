import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Highlight } from 'ngx-highlightjs';
import { HighlightLineNumbers } from 'ngx-highlightjs/line-numbers';
import { SearchResult } from './state/search-result.model';

const extToLang: Record<string, string> = {
  sh: 'bash',
  zsh: 'bash',
  c: 'c',
  cc: 'cpp',
  cpp: 'cpp',
  cxx: 'cpp',
  h: 'cpp',
  hh: 'cpp',
  hpp: 'cpp',
  hxx: 'cpp',
  css: 'css',
  dart: 'dart',
  dockerfile: 'dockerfile',
  go: 'go',
  java: 'java',
  js: 'javascript',
  jsx: 'javascript',
  json: 'json',
  kt: 'kotlin',
  ktc: 'kotlin',
  lua: 'lua',
  md: 'markdown',
  php: 'php',
  proto: 'protobuf',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  scss: 'scss',
  sql: 'sql',
  swift: 'swift',
  ts: 'typescript',
  tsx: 'typescript',
  xml: 'xml',
  html: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
};

@Component({
  selector: 'app-search-result',
  imports: [Highlight, HighlightLineNumbers],
  templateUrl: './search-result.component.html',
  styleUrl: './search-result.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchResultComponent {
  result = input.required<SearchResult>();
  query = input.required<string>();
  lang = computed(() => {
    const filename = this.result().filename;
    const match = filename.match(this.extRe);
    if (!match) return 'plaintext';
    const ext = match[1].toLowerCase();
    return extToLang[ext] ?? 'plaintext';
  });
  url = computed(() => {
    const res = this.result();
    const lines = res.data.split('\n');
    const lineIndex = lines.findIndex(line => line.toLowerCase().includes(this.query().toLowerCase()));
    const lineNumber = res.startline + (lineIndex !== -1 ? lineIndex : 0);
    return `${res.projectURL}/blob/${res.ref}/${res.path}#L${lineNumber}`;
  });

  private readonly extRe = /\.(\w+)$/;
}
