package com.vibeshelf.vibeshelf_backend.config;

import java.nio.charset.StandardCharsets;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
// @Component disabled: do not run automatic manual migrations at startup per user request.
// ApplicationRunner removed to prevent automatic migration execution at startup.
public class ManualMigrationRunner {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    /**
     * Manual migration helper. Call this method manually to run the V2 migration if needed.
     */
    public void applyManualMigration() throws Exception {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'reviews'",
                    Integer.class);

            if (count == null || count == 0) {
                // read migration SQL from classpath
                ClassPathResource r = new ClassPathResource("db/migration/V2__create_reviews_table.sql");
                byte[] bytes = r.getInputStream().readAllBytes();
                String sql = new String(bytes, StandardCharsets.UTF_8);
                // Execute SQL. The file contains a single CREATE TABLE IF NOT EXISTS statement.
                jdbcTemplate.execute(sql);
                System.out.println("ManualMigrationRunner: created reviews table from migration SQL");
            } else {
                System.out.println("ManualMigrationRunner: reviews table already exists");
            }
        } catch (Exception e) {
            System.err.println("ManualMigrationRunner: migration check failed: " + e.getMessage());
            // don't fail startup — log and continue
        }
    }
}
