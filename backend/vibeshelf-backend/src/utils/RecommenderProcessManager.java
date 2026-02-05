package com.vibeshelf.vibeshelf_backend.utils;

import java.io.File;
import java.io.IOException;

public class RecommenderProcessManager {

    private static Process recommenderProcess;

    public static void startRecommender() {
        // Auto-start disabled. Start the Python recommender manually outside the Java process.
        System.out.println("� Auto-start for FastAPI recommender is disabled. Start it manually if needed.");
    }

    public static boolean isRunning() {
        return recommenderProcess != null && recommenderProcess.isAlive();
    }

    public static void stopRecommender() {
        if (isRunning()) {
            recommenderProcess.destroy();
            System.out.println("🛑 Stopped FastAPI recommender");
        }
    }
}
