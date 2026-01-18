"""
RATIO Bot Monitor
=================
Handles trade logging, P&L tracking, and performance monitoring.
"""

import csv
import logging
import os
from datetime import datetime
from typing import Optional
import pandas as pd

from lllm_config import (
    TRADES_CSV_FILE,
    PERFORMANCE_CSV_FILE,
    SIGNALS_LOG_FILE,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TradeMonitor:
    """
    Monitor for tracking trades, P&L, and performance metrics.
    
    Features:
    - CSV logging of all trades
    - P&L calculation
    - Performance statistics
    - Daily/weekly/monthly reports
    """
    
    TRADE_COLUMNS = [
        "timestamp",
        "trade_id",
        "basket_category",
        "long_assets",
        "short_assets",
        "confidence",
        "entry_ratio",
        "sl_ratio",
        "tp_ratio",
        "size_usd",
        "risk_usd",
        "execution_type",
        "status",
        "exit_timestamp",
        "exit_ratio",
        "pnl_usd",
        "pnl_percent",
        "exit_reason",
    ]
    
    def __init__(
        self,
        trades_file: Optional[str] = None,
        performance_file: Optional[str] = None,
    ):
        """
        Initialize the Trade Monitor.
        
        Args:
            trades_file: Path to trades CSV file
            performance_file: Path to performance CSV file
        """
        self.trades_file = trades_file or TRADES_CSV_FILE
        self.performance_file = performance_file or PERFORMANCE_CSV_FILE
        
        # Ensure log directory exists
        log_dir = os.path.dirname(SIGNALS_LOG_FILE)
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir)
        
        # Initialize trades file if doesn't exist
        self._init_trades_file()
        
        logger.info(f"TradeMonitor initialized")
        logger.info(f"  Trades file: {self.trades_file}")
    
    def _init_trades_file(self):
        """Initialize trades CSV with headers if doesn't exist."""
        if not os.path.exists(self.trades_file):
            with open(self.trades_file, "w", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(self.TRADE_COLUMNS)
            logger.info(f"Created trades file: {self.trades_file}")
    
    def log_trade(
        self,
        signal: dict,
        position: dict,
        execution_result: dict,
    ) -> dict:
        """
        Log a new trade to CSV.
        
        Args:
            signal: The trading signal
            position: Position sizing details
            execution_result: Trade execution result
            
        Returns:
            Trade record dict
        """
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        
        # Extract basket info
        long_basket = signal.get("long_basket", [])
        short_basket = signal.get("short_basket", [])
        
        long_assets = ",".join([a["coin"] for a in long_basket])
        short_assets = ",".join([a["coin"] for a in short_basket])
        
        # Build trade record
        trade_record = {
            "timestamp": timestamp,
            "trade_id": execution_result.get("trade_id", "N/A"),
            "basket_category": signal.get("basket_category", "UNKNOWN"),
            "long_assets": long_assets,
            "short_assets": short_assets,
            "confidence": signal.get("confidence", 0),
            "entry_ratio": execution_result.get("entry_ratio", 0),
            "sl_ratio": execution_result.get("sl_ratio", 0),
            "tp_ratio": execution_result.get("tp_ratio", 0),
            "size_usd": position.get("size_usd", 0),
            "risk_usd": position.get("risk_usd", 0),
            "execution_type": signal.get("execution_recommendation", "MARKET"),
            "status": execution_result.get("status", "unknown"),
            "exit_timestamp": "",
            "exit_ratio": "",
            "pnl_usd": "",
            "pnl_percent": "",
            "exit_reason": "",
        }
        
        # Write to CSV
        self._append_trade(trade_record)
        
        logger.info(f"Trade logged: {trade_record['trade_id']} - {trade_record['basket_category']}")
        
        return trade_record
    
    def _append_trade(self, trade_record: dict):
        """Append a trade record to the CSV file."""
        with open(self.trades_file, "a", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=self.TRADE_COLUMNS)
            writer.writerow(trade_record)
    
    def update_trade(
        self,
        trade_id: str,
        exit_ratio: float,
        pnl_usd: float,
        pnl_percent: float,
        exit_reason: str,
    ):
        """
        Update a trade with exit information.
        
        Args:
            trade_id: The trade ID to update
            exit_ratio: Exit ratio
            pnl_usd: Profit/loss in USD
            pnl_percent: Profit/loss percentage
            exit_reason: Reason for exit (TP, SL, MANUAL)
        """
        exit_timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        
        # Read all trades
        df = self.get_trades_dataframe()
        
        if df.empty:
            logger.warning(f"No trades found to update")
            return
        
        # Find and update the trade
        mask = df["trade_id"] == trade_id
        if not mask.any():
            logger.warning(f"Trade {trade_id} not found")
            return
        
        df.loc[mask, "exit_timestamp"] = exit_timestamp
        df.loc[mask, "exit_ratio"] = exit_ratio
        df.loc[mask, "pnl_usd"] = pnl_usd
        df.loc[mask, "pnl_percent"] = pnl_percent
        df.loc[mask, "exit_reason"] = exit_reason
        df.loc[mask, "status"] = "closed"
        
        # Write back to CSV
        df.to_csv(self.trades_file, index=False)
        
        logger.info(f"Trade {trade_id} updated: PnL ${pnl_usd:.2f} ({pnl_percent:+.2f}%)")
    
    def get_trades_dataframe(self) -> pd.DataFrame:
        """
        Load trades as a pandas DataFrame.
        
        Returns:
            DataFrame of all trades
        """
        if not os.path.exists(self.trades_file):
            return pd.DataFrame(columns=self.TRADE_COLUMNS)
        
        try:
            df = pd.read_csv(self.trades_file)
            return df
        except Exception as e:
            logger.error(f"Failed to load trades: {e}")
            return pd.DataFrame(columns=self.TRADE_COLUMNS)
    
    def calculate_performance(self) -> dict:
        """
        Calculate performance statistics.
        
        Returns:
            Performance metrics dict
        """
        df = self.get_trades_dataframe()
        
        if df.empty:
            return {
                "total_trades": 0,
                "open_trades": 0,
                "closed_trades": 0,
                "win_rate": 0,
                "total_pnl_usd": 0,
                "avg_pnl_usd": 0,
                "best_trade_usd": 0,
                "worst_trade_usd": 0,
                "avg_confidence": 0,
            }
        
        # Filter closed trades with P&L
        closed = df[df["status"] == "closed"].copy()
        closed["pnl_usd"] = pd.to_numeric(closed["pnl_usd"], errors="coerce")
        
        # Calculate metrics
        total_trades = len(df)
        open_trades = len(df[df["status"] != "closed"])
        closed_trades = len(closed)
        
        if closed_trades > 0:
            winners = closed[closed["pnl_usd"] > 0]
            win_rate = len(winners) / closed_trades * 100
            total_pnl = closed["pnl_usd"].sum()
            avg_pnl = closed["pnl_usd"].mean()
            best_trade = closed["pnl_usd"].max()
            worst_trade = closed["pnl_usd"].min()
        else:
            win_rate = 0
            total_pnl = 0
            avg_pnl = 0
            best_trade = 0
            worst_trade = 0
        
        avg_confidence = df["confidence"].mean() if "confidence" in df.columns else 0
        
        return {
            "total_trades": total_trades,
            "open_trades": open_trades,
            "closed_trades": closed_trades,
            "win_rate": round(win_rate, 1),
            "total_pnl_usd": round(total_pnl, 2),
            "avg_pnl_usd": round(avg_pnl, 2),
            "best_trade_usd": round(best_trade, 2),
            "worst_trade_usd": round(worst_trade, 2),
            "avg_confidence": round(avg_confidence, 1),
        }
    
    def get_recent_trades(self, limit: int = 10) -> list[dict]:
        """
        Get most recent trades.
        
        Args:
            limit: Maximum number of trades to return
            
        Returns:
            List of trade dicts
        """
        df = self.get_trades_dataframe()
        
        if df.empty:
            return []
        
        recent = df.tail(limit)
        return recent.to_dict("records")
    
    def get_trades_by_category(self) -> dict:
        """
        Group trades by basket category.
        
        Returns:
            Dict with category stats
        """
        df = self.get_trades_dataframe()
        
        if df.empty:
            return {}
        
        results = {}
        for category in df["basket_category"].unique():
            cat_df = df[df["basket_category"] == category]
            closed = cat_df[cat_df["status"] == "closed"]
            
            if len(closed) > 0:
                closed["pnl_usd"] = pd.to_numeric(closed["pnl_usd"], errors="coerce")
                winners = closed[closed["pnl_usd"] > 0]
                win_rate = len(winners) / len(closed) * 100
                total_pnl = closed["pnl_usd"].sum()
            else:
                win_rate = 0
                total_pnl = 0
            
            results[category] = {
                "total_trades": len(cat_df),
                "closed_trades": len(closed),
                "win_rate": round(win_rate, 1),
                "total_pnl_usd": round(total_pnl, 2),
            }
        
        return results
    
    def generate_report(self) -> str:
        """
        Generate a text performance report.
        
        Returns:
            Formatted report string
        """
        perf = self.calculate_performance()
        by_category = self.get_trades_by_category()
        
        report = f"""
╔══════════════════════════════════════════════════════════════╗
║                 RATIO BOT PERFORMANCE REPORT                 ║
╠══════════════════════════════════════════════════════════════╣
║ Generated: {datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"):<47} ║
╠══════════════════════════════════════════════════════════════╣
║ OVERALL STATISTICS                                           ║
╠══════════════════════════════════════════════════════════════╣
║ Total Trades:    {perf['total_trades']:<10} Open: {perf['open_trades']:<5} Closed: {perf['closed_trades']:<5}     ║
║ Win Rate:        {perf['win_rate']:.1f}%                                          ║
║ Total P&L:       ${perf['total_pnl_usd']:>10,.2f}                               ║
║ Average P&L:     ${perf['avg_pnl_usd']:>10,.2f}                               ║
║ Best Trade:      ${perf['best_trade_usd']:>10,.2f}                               ║
║ Worst Trade:     ${perf['worst_trade_usd']:>10,.2f}                               ║
║ Avg Confidence:  {perf['avg_confidence']:.1f}/10                                        ║
╠══════════════════════════════════════════════════════════════╣
║ BY BASKET CATEGORY                                           ║
╠══════════════════════════════════════════════════════════════╣"""
        
        for category, stats in by_category.items():
            report += f"""
║ {category:<20} Trades: {stats['total_trades']:<4} Win: {stats['win_rate']:>5.1f}% P&L: ${stats['total_pnl_usd']:>8,.2f} ║"""
        
        report += """
╚══════════════════════════════════════════════════════════════╝"""
        
        return report


# =============================================================================
# TESTING
# =============================================================================

if __name__ == "__main__":
    import json
    
    print("=" * 60)
    print("RATIO BOT - MONITOR TEST")
    print("=" * 60)
    
    # Use test file
    test_file = "test_trades.csv"
    
    # Clean up test file if exists
    if os.path.exists(test_file):
        os.remove(test_file)
    
    monitor = TradeMonitor(trades_file=test_file)
    
    # Log some test trades
    print("\n--- Logging Test Trades ---")
    
    test_signal_1 = {
        "basket_category": "METALS_VS_CRYPTO",
        "long_basket": [{"coin": "XAU", "weight": 0.5}, {"coin": "XAG", "weight": 0.5}],
        "short_basket": [{"coin": "BTC", "weight": 0.5}, {"coin": "ETH", "weight": 0.5}],
        "confidence": 7.5,
        "execution_recommendation": "MARKET",
    }
    
    test_position_1 = {"size_usd": 2500, "risk_usd": 125}
    test_execution_1 = {"trade_id": "TEST_001", "status": "open", "entry_ratio": 18.09, "sl_ratio": 16.65, "tp_ratio": 21.71}
    
    record1 = monitor.log_trade(test_signal_1, test_position_1, test_execution_1)
    print(f"Logged trade 1: {record1['trade_id']}")
    
    test_signal_2 = {
        "basket_category": "CRYPTO_VS_CRYPTO",
        "long_basket": [{"coin": "BTC", "weight": 0.6}, {"coin": "ETH", "weight": 0.4}],
        "short_basket": [{"coin": "SOL", "weight": 0.5}, {"coin": "AVAX", "weight": 0.5}],
        "confidence": 6.8,
        "execution_recommendation": "TWAP",
    }
    
    test_position_2 = {"size_usd": 2000, "risk_usd": 100}
    test_execution_2 = {"trade_id": "TEST_002", "status": "open", "entry_ratio": 1.25, "sl_ratio": 1.19, "tp_ratio": 1.40}
    
    record2 = monitor.log_trade(test_signal_2, test_position_2, test_execution_2)
    print(f"Logged trade 2: {record2['trade_id']}")
    
    # Update first trade as closed (winner)
    print("\n--- Updating Trade 1 (Winner) ---")
    monitor.update_trade(
        trade_id="TEST_001",
        exit_ratio=20.50,
        pnl_usd=250.00,
        pnl_percent=10.0,
        exit_reason="TP"
    )
    
    # Update second trade as closed (loser)
    print("\n--- Updating Trade 2 (Loser) ---")
    monitor.update_trade(
        trade_id="TEST_002",
        exit_ratio=1.18,
        pnl_usd=-100.00,
        pnl_percent=-5.0,
        exit_reason="SL"
    )
    
    # Get performance
    print("\n--- Performance Statistics ---")
    perf = monitor.calculate_performance()
    print(json.dumps(perf, indent=2))
    
    # Get by category
    print("\n--- By Category ---")
    by_cat = monitor.get_trades_by_category()
    print(json.dumps(by_cat, indent=2))
    
    # Generate report
    print("\n--- Performance Report ---")
    print(monitor.generate_report())
    
    # Clean up test file
    if os.path.exists(test_file):
        os.remove(test_file)
        print(f"\nCleaned up test file: {test_file}")

