import csv
import json

produtos = []

# Lê o arquivo CSV que você salvou da planilha
with open('produtos.csv', mode='r', encoding='utf-8-sig') as arquivo_csv:
    leitor = csv.DictReader(arquivo_csv)
    
    for linha in leitor:
        # Monta a estrutura exata que o site espera
        produto = {
            "id": linha["id"],
            "categoria": linha["categoria"],
            "titulo": linha["titulo"],
            "subtitulo": linha["subtitulo"],
            "imagem": linha["imagem"],
            "preco": linha["preco"],
            "pix": linha["pix"],
            "parcelado": linha["parcelado"],
            "links": {
                "tiktok": linha["link_tiktok"],
                "olx": linha["link_olx"],
                "mypcards": linha["link_mypcards"],
                "whats": linha["link_whats"]
            }
        }
        produtos.append(produto)

# Gera o arquivo produtos.json final
with open('produtos.json', mode='w', encoding='utf-8') as arquivo_json:
    json.dump(produtos, arquivo_json, ensure_ascii=False, indent=2)

print("✅ produtos.json gerado com sucesso! Agora é só subir para o GitHub.")
