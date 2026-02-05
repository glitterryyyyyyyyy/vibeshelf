Dev run: start recommender + backend with one command

Use the helper script to start the FastAPI recommender and the Spring Boot app in one step.

From the project root (/Users/shreyajamwal/Downloads/vibeshelf-backend/vibeshelf-backend):

```bash
chmod +x bin/dev-start.sh
./bin/dev-start.sh
```

What the script does:
- starts the FastAPI recommender (uvicorn) on 127.0.0.1:5001 in the background and logs to `books/recommender.log`
- waits up to ~60s for the recommender to respond
- runs `./mvnw spring-boot:run` (dev mode) so you get live reload + logs

Notes:
- Make sure Python deps are installed: `python3 -m pip install -r books/requirements.txt`.
- The first FastAPI start will download the SentenceTransformer model (may take time and bandwidth).
- If you prefer running services in separate terminals, you can start uvicorn manually and then run `./mvnw spring-boot:run`.
