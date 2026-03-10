import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDangerous } from '../commands/utils/danger.js';

// ─── Dangerous commands ───────────────────────────────────────────

test('isDangerous: detects rm -rf', () => {
  assert.equal(isDangerous('rm -rf /tmp/foo'), true);
  assert.equal(isDangerous('rm -fr /home/user'), true);
  assert.equal(isDangerous('rm -Rf /var/cache'), true);
});

test('isDangerous: detects docker system prune', () => {
  assert.equal(isDangerous('docker system prune -af'), true);
  assert.equal(isDangerous('docker system prune --volumes'), true);
  assert.equal(isDangerous('docker container prune'), true);
  assert.equal(isDangerous('docker volume prune'), true);
});

test('isDangerous: detects kubectl delete', () => {
  assert.equal(isDangerous('kubectl delete pod my-pod -n production'), true);
  assert.equal(isDangerous('kubectl delete deployment api'), true);
  assert.equal(isDangerous('kubectl drain node-1 --ignore-daemonsets'), true);
});

test('isDangerous: detects terraform destroy and apply', () => {
  assert.equal(isDangerous('terraform destroy'), true);
  assert.equal(isDangerous('terraform apply -auto-approve'), true);
});

test('isDangerous: detects SQL destructive statements', () => {
  assert.equal(isDangerous('DROP TABLE users'), true);
  assert.equal(isDangerous('drop database mydb'), true);
  assert.equal(isDangerous('TRUNCATE TABLE orders'), true);
  assert.equal(isDangerous('DELETE FROM sessions'), true);
});

test('isDangerous: detects git force push and hard reset', () => {
  assert.equal(isDangerous('git push origin main --force'), true);
  assert.equal(isDangerous('git push -f origin main'), true);
  assert.equal(isDangerous('git reset --hard HEAD~3'), true);
  assert.equal(isDangerous('git clean -fd'), true);
});

test('isDangerous: detects dd with output file', () => {
  assert.equal(isDangerous('dd if=/dev/zero of=/dev/sda'), true);
});

// ─── Safe commands ────────────────────────────────────────────────

test('isDangerous: allows safe commands', () => {
  assert.equal(isDangerous('docker ps'), false);
  assert.equal(isDangerous('kubectl get pods -n production'), false);
  assert.equal(isDangerous('git status'), false);
  assert.equal(isDangerous('git push origin feature/my-branch'), false);
  assert.equal(isDangerous('terraform plan'), false);
  assert.equal(isDangerous('SELECT * FROM users'), false);
  assert.equal(isDangerous('npm install'), false);
  assert.equal(isDangerous('ls -la'), false);
});

test('isDangerous: allows git rm (tracked file removal, not system rm)', () => {
  assert.equal(isDangerous('git rm --cached file.txt'), false);
});
