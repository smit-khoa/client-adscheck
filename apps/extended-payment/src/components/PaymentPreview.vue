<script setup lang="ts">
import { Icon } from '@mf2/shared-ui/icons';
import type { ExtendedPaymentField } from '../types';

defineProps<{
  fields: ExtendedPaymentField[];
  signature: string;
}>();
</script>

<template>
  <aside class="body-right">
    <div class="preview-modal">
      <div class="modal-head">
        <div class="modal-head-left">
          <span class="modal-logo"><Icon name="file-text" :size="15" /></span>
          <p>Ads Check by SMIT</p>
        </div>
        <div class="modal-head-right">
          <a href="https://smit.vn/" target="_blank" rel="noreferrer">SMIT.VN</a>
          <button type="button" aria-label="Thu nhỏ"><Icon name="minus" :size="14" /></button>
        </div>
      </div>

      <div class="modal-content">
        <div class="note">
          <Icon name="alert-triangle" :size="18" class="note-icon" />
          <div>Lưu ý: dữ liệu dưới đây chỉ là dữ liệu giả lập, không phải dữ liệu thật của tài khoản</div>
        </div>

        <div class="modal-body">
          <div v-for="field in fields" :key="field.key" class="modal-body-row">
            <Icon name="grip-vertical" :size="16" class="row-dots" />
            <div class="modal-body-content">
              <div class="modal-body-content-left">
                <Icon :name="field.iconName" :size="16" />
                <p>{{ field.label }}</p>
              </div>
              <div
                v-if="field.badge"
                class="pill-value"
              >
                {{ field.sampleValue }}
              </div>
              <div
                v-else
                class="row-value"
                :class="{ active: field.key === 'account_status' }"
              >
                {{ field.sampleValue }}
              </div>
            </div>
          </div>
        </div>

        <div class="noti-agency">
          <div class="agency-logo"><Icon name="building-2" :size="17" /></div>
          <div class="agency-content">
            <div class="agency-title-row">
              <div class="agency-title">SMIT Agency</div>
              <div class="agency-badge">Đã ra mắt</div>
            </div>
            <div class="agency-desc">Giải pháp vận hành Agency cho thuê TKQC</div>
          </div>
        </div>

        <div class="modal-footer">
          <div class="signature-content">
            <span v-if="signature" v-html="signature"></span>
            <span v-else><strong>SMIT</strong> Công ty SMIT Agency</span>
          </div>
          <span class="smit-logo">SMIT</span>
        </div>
      </div>
    </div>

    <div class="bubble">
      <Icon name="message-circle" :size="30" />
    </div>
  </aside>
</template>

<style scoped>
.body-right {
  position: relative;
  display: flex;
  width: 395px;
  height: 100%;
  justify-content: center;
  border-left: 1px solid #d5d9e1;
}

.preview-modal {
  position: absolute;
  right: 16px;
  bottom: 41px;
  z-index: 10;
  width: 340px;
  max-height: calc(100vh - 129px);
  overflow: hidden;
  background: linear-gradient(180deg, #e8f8f5 0%, #d6f2ed 100%);
  border-radius: 10px;
  box-shadow: 0 30px 57px rgba(0, 0, 0, 0.12);
}

.modal-head {
  display: flex;
  height: 50px;
  align-items: center;
  gap: 30px;
  padding: 0 11px 0 14px;
  color: #fff;
  background: linear-gradient(166.86deg, #17e180 -19.24%, #009883 125.35%);
  border-radius: 6px 6px 0 0;
}

.modal-head-left {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.modal-logo {
  display: flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.16);
}

.modal-head-left p {
  margin: 0;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  line-height: 18px;
  white-space: nowrap;
}

.modal-head-right {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.modal-head-right a,
.modal-head-right button {
  display: flex;
  height: 22px;
  align-items: center;
  justify-content: center;
  padding: 4px 6px;
  color: #10c987;
  font-size: 12px;
  font-weight: 700;
  line-height: 12px;
  text-decoration: none;
  background: #fff;
  border: 0;
  border-radius: 3px;
}

.modal-content {
  display: flex;
  height: calc(100% - 50px);
  flex-direction: column;
  padding: 7px;
}

.note,
.modal-body,
.noti-agency,
.modal-footer {
  background: rgba(249, 251, 252, 0.85);
  border-radius: 6px;
  box-shadow: 0 1.334px 0 rgba(0, 0, 0, 0.08);
}

.note {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 7px;
  padding: 8px 10px;
  color: #434f64;
  font-size: 13px;
  font-weight: 500;
  line-height: 17px;
  letter-spacing: 0.01em;
}

.note-icon {
  flex-shrink: 0;
  color: #d6a22a;
}

.modal-body {
  flex: 1;
  max-height: calc(100vh - 354px);
  overflow: auto;
  padding: 0 10px 20px;
}

.modal-body::-webkit-scrollbar {
  width: 4px;
}

.modal-body-row {
  display: flex;
  gap: 6px;
  padding-top: 15px;
  cursor: move;
}

.row-dots {
  margin-top: 7px;
  color: #b4bfce;
}

.modal-body-content {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
  padding: 7px 0;
  border-bottom: 1px solid rgba(231, 231, 231, 0.47);
  color: #434f64;
  font-size: 14px;
  line-height: 14px;
}

.modal-body-content-left {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
}

.modal-body-content-left svg {
  flex-shrink: 0;
  color: #10c987;
}

.modal-body-content-left p {
  margin: 0;
  color: #434f64;
  font-size: 13px;
  font-weight: 600;
  line-height: 14px;
  white-space: nowrap;
}

.row-value {
  margin-left: auto;
  color: #434f64;
  font-size: 13px;
  font-weight: 500;
  line-height: 14px;
  text-align: right;
  white-space: nowrap;
}

.row-value.active {
  color: #36b77a;
}

.pill-value {
  margin-left: auto;
  padding: 4px 6px;
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  line-height: 12px;
  letter-spacing: 0.01em;
  white-space: nowrap;
  background: linear-gradient(166.86deg, #17e180 -19.24%, #009883 125.35%);
  border-radius: 10px;
}

.noti-agency {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  padding: 9px;
}

.agency-logo {
  display: flex;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(167deg, #17e180 -19.24%, #009883 125.35%);
  border-radius: 5.7px;
}

.agency-title-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.agency-title {
  color: #23262f;
  font-size: 13px;
  font-weight: 700;
}

.agency-badge {
  padding: 2px 5px;
  color: #fff;
  font-size: 10px;
  font-weight: 500;
  background: linear-gradient(96deg, #977d13 1.75%, #fdd11f 45.61%, #e6be1c 76.12%, #caa719 113.71%), #fff;
  border-radius: 4px;
}

.agency-desc {
  margin-top: 4px;
  color: #434f64;
  font-size: 12px;
  font-weight: 500;
}

.modal-footer {
  display: flex;
  align-items: center;
  margin-top: 6px;
  padding: 9px 12px;
}

.signature-content {
  max-width: 224px;
  max-height: 51px;
  overflow: hidden;
  color: #777e90;
  font-size: 12px;
  font-weight: 500;
  word-break: break-word;
}

.signature-content strong {
  color: #10c987;
  font-weight: 700;
}

.smit-logo {
  margin-left: auto;
  color: #10c987;
  font-size: 18px;
  font-weight: 900;
}

.bubble {
  position: absolute;
  right: 10px;
  bottom: 12px;
  display: flex;
  width: 70px;
  height: 70px;
  align-items: center;
  justify-content: center;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(166.86deg, #17e180 -19.24%, #009883 125.35%);
  border: 3px solid #fff;
  border-radius: 50%;
  box-shadow: 0 28px 46px rgba(0, 0, 0, 0.17);
}
</style>
