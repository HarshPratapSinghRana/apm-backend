import json

with open("Ai Leap/MAQ Software AI Leap/backend/data/agents.json", encoding="utf-8") as f:
    data = json.load(f)

with open("Ai Leap/MAQ Software AI Leap/backend/media_urls.json", encoding="utf-8") as f:
    media = json.load(f)

print(f"Total domains: {len(data['domains'])}")
total = 0
for d in data['domains']:
    domain_name = d['domain']
    use_cases = d.get('use_cases', [])
    print(f"\n=== Domain: {domain_name} ({len(use_cases)}) ===")
    for u in use_cases:
        total += 1
        uid = u['id']
        title = u['title']
        m = media.get(uid, {})
        repo = m.get('github_repo', '')
        deck = m.get('artifact_deck')
        tags = u.get('tags', [])
        arch = u.get('architecture', '')
        print(f"[{total:02d}] {uid:<36} | Title: {title:<32} | Repo: {bool(repo):<5} | Deck: {bool(deck):<5} | Tags: {','.join(tags[:3])}")
