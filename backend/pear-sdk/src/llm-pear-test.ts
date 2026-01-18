import { authenticate } from './utils/auth.js';
import axios from 'axios';
import { config } from 'dotenv';
import OpenAI from 'openai';

config();

const API_URL = process.env.API_URL || 'https://hl-v2.pearprotocol.io';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface TradingSignal {
  asset: string;
  direction: 'long' | 'short';
  usdValue: number;
  leverage: number;
  reasoning: string;
}

/**
 * LLM + Pear Protocol Integration Test
 * 1. Ask LLM to generate a trading signal
 * 2. Execute the signal via Pear Protocol
 */
async function runLLMPearTest() {
  console.log('═'.repeat(60));
  console.log('🧪 LLM + PEAR PROTOCOL INTEGRATION TEST');
  console.log('═'.repeat(60));

  // Step 1: Initialize OpenAI
  console.log('\n📡 Step 1: Initializing OpenAI Client...');
  
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in .env');
    console.log('💡 Add OPENAI_API_KEY to your .env file');
    return;
  }
  
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  console.log('✅ OpenAI client initialized');

  // Step 2: Generate Trading Signal via LLM
  console.log('\n🤖 Step 2: Asking LLM to generate a trading signal...');
  
  const signalPrompt = `You are a crypto trading signal generator. Generate a single trading signal for the Pear Protocol API.

Current market context:
- BTC is currently around $95,000
- ETH is currently around $3,500
- Market sentiment is cautiously bullish

Generate a trading signal in the following JSON format:
{
    "asset": "BTC",
    "direction": "long",
    "usdValue": 10,
    "leverage": 2,
    "reasoning": "Brief explanation of why this trade"
}

Requirements:
- ONLY use BTC as the asset (this is the most liquid)
- Use usdValue of exactly 10 (this is a test trade)
- Use leverage of exactly 2
- Pick long or short direction
- Provide brief reasoning

Return ONLY the JSON, no other text.`;

  let signal: TradingSignal;
  
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a professional crypto trader assistant. Return only valid JSON.' },
        { role: 'user', content: signalPrompt }
      ],
      temperature: 0.7,
      max_tokens: 300
    });

    let signalText = completion.choices[0].message.content?.trim() || '';
    
    // Remove markdown code blocks if present
    if (signalText.startsWith('```')) {
      signalText = signalText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }
    
    signal = JSON.parse(signalText);
    
    console.log('\n' + '═'.repeat(50));
    console.log('📊 LLM GENERATED SIGNAL:');
    console.log('═'.repeat(50));
    console.log(`   Asset: ${signal.asset}`);
    console.log(`   Direction: ${signal.direction}`);
    console.log(`   USD Value: $${signal.usdValue}`);
    console.log(`   Leverage: ${signal.leverage}x`);
    console.log(`   Reasoning: ${signal.reasoning}`);
    console.log('═'.repeat(50));
    
  } catch (error: any) {
    console.error(`❌ Error generating signal: ${error.message}`);
    return;
  }

  // Step 3: Authenticate with Pear Protocol
  console.log('\n🔐 Step 3: Authenticating with Pear Protocol...');
  
  const accessToken = await authenticate();
  
  if (!accessToken) {
    console.error('❌ Authentication failed');
    return;
  }
  
  console.log('✅ Authenticated!');

  // Step 4: Convert signal to Pear Protocol format
  console.log('\n⚙️ Step 4: Converting signal to Pear Protocol format...');
  
  const positionData: any = {
    executionType: 'MARKET',
    slippage: 0.08,
    leverage: signal.leverage,
    usdValue: signal.usdValue,
    longAssets: [],
    shortAssets: []
  };

  if (signal.direction === 'long') {
    positionData.longAssets = [{ asset: signal.asset.toUpperCase(), weight: 1.0 }];
  } else {
    positionData.shortAssets = [{ asset: signal.asset.toUpperCase(), weight: 1.0 }];
  }

  console.log('\n📋 Pear Protocol Request:');
  console.log(JSON.stringify(positionData, null, 2));

  // Step 5: Execute the trade
  console.log('\n🚀 Step 5: Executing trade via Pear Protocol API...');
  
  try {
    const response = await axios.post(
      `${API_URL}/positions`,
      positionData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('\n' + '═'.repeat(60));
    console.log('✅ TRADE EXECUTED SUCCESSFULLY!');
    console.log('═'.repeat(60));
    console.log('\n📊 Execution Result:');
    console.log(JSON.stringify(response.data, null, 2));
    
    const result = response.data;
    
    if (result.orderId) {
      console.log(`\n🎯 Order ID: ${result.orderId}`);
    }
    
    if (result.fills && result.fills.length > 0) {
      console.log(`✅ Fills: ${result.fills.length}`);
      result.fills.forEach((fill: any, i: number) => {
        console.log(`   ${i + 1}. ${fill.coin}: ${fill.sz} @ $${fill.px} (fee: $${fill.fee})`);
      });
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('🎉 LLM + PEAR PROTOCOL TEST COMPLETED SUCCESSFULLY!');
    console.log('═'.repeat(60));
    
  } catch (error: any) {
    console.error('\n❌ Error executing trade:');
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(`   Error: ${error.message}`);
    }
  }

  console.log('\n✨ Test complete!');
}

runLLMPearTest();
