# v0.1.0
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

# Correction: import gl explicitly — not a wildcard
import genlayer.gl as gl
# Correction: TreeMap and u256 imported separately
from genlayer import TreeMap, u256
import json

WINS_NEEDED = 3


class RugOrMoon(gl.Contract):

    game_count: u256
    games: TreeMap[u256, str]

    def __init__(self):
        self.game_count = u256(0)

    # ── CREATE GAME ───────────────────────────────────────────────────────────
    @gl.public.write
    def create_game(self, player_name: str) -> None:
        game_id = int(self.game_count) + 1
        self.game_count = u256(game_id)

        # Generate the first fake crypto project
        # Correction: first arg is a function; full prompt inside gl.nondet.exec_prompt()
        # Correction: function returns raw string; json.loads goes OUTSIDE
        def generate_project():
            return gl.nondet.exec_prompt(
                "You are a generator of hilariously fake crypto projects for a party game called RUG OR MOON. "
                "Generate ONE absurd fake crypto project. It must have real red flags AND real green flags mixed together so it's genuinely hard to tell if it will rug or moon. "
                "Make it funny, relatable to web3 culture, and realistic enough to be believable. "
                "Examples of vibes: "
                "'$DOGDAO — A DAO governed entirely by golden retrievers. Backers include a 14-year-old named Kevin and a Cayman Islands shell company. Liquidity locked for 48 hours. Roadmap includes a metaverse dog park in Q3.' "
                "'$SOULBOUND — An NFT project where your token is legally bound to your soul via a smart contract written in Comic Sans. KYC required. Whitepaper is 200 pages but chapter 4 is just the lyrics to Wonderwall.' "
                "'$GIGABRAIN — AI-powered DeFi protocol that predicts rug pulls using other rug pulls as training data. Audited by a firm called TrustMeBro LLC. TVL: $47M. Team: fully doxxed except the CEO who goes by ChaoticNeutral.' "
                "Respond ONLY with this exact JSON and nothing else: "
                '{"name": "PROJECT NAME", "ticker": "$TICKER", "tagline": "one funny sentence describing the project", "green_flags": ["flag1", "flag2", "flag3"], "red_flags": ["flag1", "flag2", "flag3"], "whitepaper_quote": "one absurd quote from the whitepaper"} '
                "No extra text outside the JSON. No markdown backticks."
            ).replace("```json", "").replace("```", "").strip()

        # Correction: prompt_non_comparative for creative/subjective output
        project_str = gl.eq_principle.prompt_non_comparative(
            generate_project,
            task="Generate a funny fake crypto project with mixed red and green flags",
            criteria="Valid JSON with name, ticker, tagline, green_flags (3 items), red_flags (3 items), whitepaper_quote — funny and believable web3 parody"
        )

        # Correction: json.loads OUTSIDE the non-deterministic function
        try:
            project = json.loads(project_str)
        except Exception:
            project = {
                "name": "RUGMASTER PROTOCOL",
                "ticker": "$RMP",
                "tagline": "Decentralizing trust, one exit scam at a time",
                "green_flags": ["Audited by CertiK", "500k Twitter followers", "Binance listing rumour"],
                "red_flags": ["Anonymous team", "Liquidity locked 24hrs", "Whitepaper written in emojis"],
                "whitepaper_quote": "We are not responsible for any financial decisions made after reading this document."
            }

        state = {
            "game_id": game_id,
            "status": "waiting",
            "players": [player_name],
            "scores": {player_name: 0},
            "current_round": 1,
            "current_project": project,
            "picks": {},
            "arguments": {},
            "round_winner": None,
            "round_verdict": None,
            "round_outcome": None,
            "game_winner": None,
            "history": []
        }
        self.games[u256(game_id)] = json.dumps(state)

    # ── JOIN GAME ─────────────────────────────────────────────────────────────
    @gl.public.write
    def join_game(self, game_id: int, player_name: str) -> None:
        key = u256(game_id)
        # Correction: TreeMap has no .get() — use if key in, then brackets
        if key not in self.games:
            return
        state = json.loads(self.games[key])

        if state["status"] != "waiting":
            return
        if len(state["players"]) >= 2:
            return
        if player_name in state["players"]:
            return

        state["players"].append(player_name)
        state["scores"][player_name] = 0
        state["status"] = "picking"
        self.games[key] = json.dumps(state)

    # ── SUBMIT PICK ───────────────────────────────────────────────────────────
    @gl.public.write
    def submit_pick(self, game_id: int, player_name: str, pick: str, argument: str) -> None:
        # pick must be "RUG" or "MOON"
        key = u256(game_id)
        if key not in self.games:
            return
        state = json.loads(self.games[key])

        if state["status"] != "picking":
            return
        if player_name not in state["players"]:
            return
        if player_name in state["picks"]:
            return
        if pick not in ["RUG", "MOON"]:
            return

        state["picks"][player_name] = pick
        state["arguments"][player_name] = argument

        # When BOTH players have submitted — AI reveals the outcome
        if len(state["picks"]) == 2:
            p1 = state["players"][0]
            p2 = state["players"][1]
            pick1 = state["picks"][p1]
            pick2 = state["picks"][p2]
            arg1 = state["arguments"][p1]
            arg2 = state["arguments"][p2]
            project = state["current_project"]

            project_summary = (
                f"Project: {project.get('name', '???')} ({project.get('ticker', '???')}) — "
                f"{project.get('tagline', '')}. "
                f"Green flags: {', '.join(project.get('green_flags', []))}. "
                f"Red flags: {', '.join(project.get('red_flags', []))}."
            )

            def reveal_outcome():
                return gl.nondet.exec_prompt(
                    f"You are the all-knowing Crypto Oracle in RUG OR MOON — a party game where players bet whether a fake crypto project rugs or moons. "
                    f"You decide the outcome based on which player made the more convincing, funnier, or more insightful argument. "
                    f"The project: {project_summary} "
                    f"Player {p1} called {pick1} and argued: {arg1} "
                    f"Player {p2} called {pick2} and argued: {arg2} "
                    f"First decide: did this project RUG or MOON? Pick whichever outcome the more convincing argument supports. "
                    f"The player who called the correct outcome AND had the better argument wins the round. "
                    f"If both called the same outcome, the one with the better argument wins. "
                    f"Be dramatic, funny, and ruthless. Reference specific details from the project and the arguments. "
                    f"Respond ONLY with this exact JSON and nothing else: "
                    f'{{"outcome": "RUG or MOON", "winner": "{p1} or {p2}", "verdict": "Your funny 2-sentence ruling explaining why the project rugged or mooned and why the winner called it"}} '
                    f"outcome must be exactly RUG or MOON. winner must be exactly {p1} or {p2}. No extra text outside the JSON."
                ).replace("```json", "").replace("```", "").strip()

            result_str = gl.eq_principle.prompt_non_comparative(
                reveal_outcome,
                task="Decide if the fake crypto project rugged or mooned and which player called it better",
                criteria=f"JSON with outcome (RUG or MOON), winner (exactly '{p1}' or '{p2}'), and a funny verdict under 60 words"
            )

            # json.loads OUTSIDE the function
            try:
                result = json.loads(result_str)
                outcome = str(result.get("outcome", "RUG")).strip().upper()
                winner = str(result.get("winner", p1)).strip()
                verdict = str(result.get("verdict", "The oracle has spoken."))
                if outcome not in ["RUG", "MOON"]:
                    outcome = "RUG"
                if winner not in [p1, p2]:
                    if p1.lower() in winner.lower():
                        winner = p1
                    else:
                        winner = p2
            except Exception:
                outcome = "RUG"
                winner = p1
                verdict = "The oracle's crystal ball short-circuited. Winner decided by vibes."

            # Record round
            state["history"].append({
                "round": state["current_round"],
                "project": project,
                "picks": {p1: pick1, p2: pick2},
                "arguments": {p1: arg1, p2: arg2},
                "outcome": outcome,
                "winner": winner,
                "verdict": verdict
            })

            state["scores"][winner] = state["scores"].get(winner, 0) + 1
            state["round_winner"] = winner
            state["round_verdict"] = verdict
            state["round_outcome"] = outcome

            # Check game winner
            if state["scores"][winner] >= WINS_NEEDED:
                state["status"] = "finished"
                state["game_winner"] = winner
            else:
                # Generate next project for next round
                next_round = state["current_round"] + 1
                prev_name = project.get("name", "")

                def generate_next_project():
                    return gl.nondet.exec_prompt(
                        f"Generate a NEW hilariously fake crypto project for round {next_round} of RUG OR MOON. "
                        f"The previous project was {prev_name} — make this one completely different. "
                        f"Mix real green flags and red flags so it's genuinely hard to tell. Make it funny and web3-culture relevant. "
                        f"Respond ONLY with this exact JSON and nothing else: "
                        f'{{"name": "PROJECT NAME", "ticker": "$TICKER", "tagline": "one funny sentence", "green_flags": ["flag1", "flag2", "flag3"], "red_flags": ["flag1", "flag2", "flag3"], "whitepaper_quote": "one absurd quote"}} '
                        f"No extra text. No markdown backticks."
                    ).replace("```json", "").replace("```", "").strip()

                next_project_str = gl.eq_principle.prompt_non_comparative(
                    generate_next_project,
                    task="Generate a new funny fake crypto project different from the previous one",
                    criteria="Valid JSON with name, ticker, tagline, green_flags, red_flags, whitepaper_quote — funny web3 parody, different from previous project"
                )

                try:
                    next_project = json.loads(next_project_str)
                except Exception:
                    next_project = {
                        "name": "VAPORWARE FINANCE",
                        "ticker": "$VAPE",
                        "tagline": "Building the future, one deleted tweet at a time",
                        "green_flags": ["VC backed", "Real product coming Q4", "Community of 1M"],
                        "red_flags": ["Q4 was 2021", "VCs are the founders' cousins", "1M bots"],
                        "whitepaper_quote": "Decentralization is a spectrum and we are at the beginning of that spectrum."
                    }

                state["current_round"] = next_round
                state["current_project"] = next_project
                state["picks"] = {}
                state["arguments"] = {}
                state["round_winner"] = None
                state["round_verdict"] = None
                state["round_outcome"] = None
                state["status"] = "picking"

        self.games[key] = json.dumps(state)

    # ── VIEW METHODS ──────────────────────────────────────────────────────────
    @gl.public.view
    def get_game(self, game_id: int) -> str:
        key = u256(game_id)
        if key in self.games:
            return self.games[key]
        return ""

    @gl.public.view
    def get_game_count(self) -> int:
        return int(self.game_count)
